"""
Admin API Endpoints

Provides admin-only endpoints for user management.
Requires admin role verification via is_admin flag in profiles table.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.auth import get_current_user
from app.core.supabase_client import get_supabase_client

router = APIRouter()


class ManagedUser(BaseModel):
    """User data for admin management"""
    id: str
    email: str
    name: Optional[str] = None
    created_at: str
    is_pro: bool = False
    pro_expires_at: Optional[str] = None
    is_admin: bool = False


class UserStats(BaseModel):
    """User statistics"""
    total_users: int
    pro_users: int
    free_users: int


class AdminUsersResponse(BaseModel):
    """Response for admin users list"""
    users: List[ManagedUser]
    stats: UserStats


async def verify_admin(user_id: str = Depends(get_current_user)) -> str:
    """Verify that the current user is an admin"""
    supabase = get_supabase_client()
    
    # Check if user has admin flag
    result = await supabase.from_("profiles").select("is_admin").eq("id", user_id).maybe_single().execute()
    
    if not result or not result.data or not result.data.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user_id


@router.get("/users", response_model=AdminUsersResponse)
async def list_users(
    admin_id: str = Depends(verify_admin)
):
    """
    List all users with their subscription status.
    
    Requires admin role (is_admin=true in profiles table).
    Returns user data from auth.users combined with profiles and subscriptions.
    """
    supabase = get_supabase_client()
    
    try:
        # Fetch all auth users using service role key
        auth_response = await supabase.auth.admin.list_users()
        auth_users = auth_response.users if hasattr(auth_response, 'users') else []
        
        # Fetch all profiles
        profiles_result = await supabase.from_("profiles").select("id, name, is_admin").execute()
        profiles = {p["id"]: p for p in (profiles_result.data or [])}
        
        # Fetch subscription status
        subs_result = await supabase.from_("user_subscriptions").select("user_id, is_active, expires_at").execute()
        subscriptions = {s["user_id"]: s for s in (subs_result.data or [])}
        
        # Combine data
        users = []
        for auth_user in auth_users:
            profile = profiles.get(auth_user.id, {})
            sub = subscriptions.get(auth_user.id, {})
            
            users.append(ManagedUser(
                id=auth_user.id,
                email=auth_user.email or "",
                name=profile.get("name"),
                created_at=auth_user.created_at,
                is_pro=sub.get("is_active", False),
                pro_expires_at=sub.get("expires_at"),
                is_admin=profile.get("is_admin", False)
            ))
        
        # Calculate stats
        pro_count = sum(1 for u in users if u.is_pro)
        
        return AdminUsersResponse(
            users=users,
            stats=UserStats(
                total_users=len(users),
                pro_users=pro_count,
                free_users=len(users) - pro_count
            )
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.post("/users/{user_id}/toggle-pro")
async def toggle_pro_status(
    user_id: str,
    admin_id: str = Depends(verify_admin)
):
    """
    Toggle Pro subscription status for a user.
    
    Requires admin role.
    Updates the user_subscriptions table.
    """
    supabase = get_supabase_client()
    
    try:
        # Check current subscription status
        result = await supabase.from_("user_subscriptions").select("*").eq("user_id", user_id).maybe_single().execute()
        
        current_status = result.data.get("is_active", False) if result and result.data else False
        new_status = not current_status
        
        if result and result.data:
            # Update existing subscription
            await supabase.from_("user_subscriptions").update({
                "is_active": new_status,
                "expires_at": None if not new_status else "2099-12-31T23:59:59Z",  # Far future for admin grants
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
        else:
            # Create new subscription record
            await supabase.from_("user_subscriptions").insert({
                "user_id": user_id,
                "is_active": new_status,
                "expires_at": "2099-12-31T23:59:59Z" if new_status else None,
                "platform": "admin_grant",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        
        return {
            "success": True,
            "user_id": user_id,
            "is_pro": new_status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle Pro status: {str(e)}"
        )
