/**
 * Terms of Service Screen
 * 
 * Displays the terms of service for the North mobile app.
 * Required for App Store compliance.
 * 
 * Validates: Requirements 20.6
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/contexts/ThemeContext';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: February 2, 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          By accessing or using North ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Description of Service</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          North is a mobile application that provides AI-powered coaching services. The App allows you to:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Create and manage personal context (values, goals, projects, constraints)</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Interact with AI coaches for guidance and decision-making support</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Create custom AI coaches (Pro subscription required)</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Access your coaching conversations across devices</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. User Accounts</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To use North, you must:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Be at least 13 years of age</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Provide accurate and complete registration information</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Maintain the security of your account credentials</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Notify us immediately of any unauthorized access</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Be responsible for all activities under your account</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Subscription Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          North offers two subscription tiers:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Free Tier: Limited to 3 context items, access to default coaches</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Pro Tier: Unlimited context items, custom coach creation</Text>
        
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Pro Subscription Details:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Monthly: $9.99/month, auto-renewing</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Annual: $79.99/year, auto-renewing</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Payment charged to your Google Play or Apple App Store account</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Auto-renewal can be disabled in account settings</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Cancellation takes effect at the end of the current billing period</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• No refunds for partial periods</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Acceptable Use</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You agree NOT to:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Use the App for any illegal purpose</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Attempt to gain unauthorized access to our systems</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Reverse engineer or decompile the App</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Share your account with others</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Use the App to harass, abuse, or harm others</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Submit malicious code or viruses</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Scrape or extract data from the App</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. AI-Generated Content</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Important disclaimers about AI coaching:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• AI responses are generated by machine learning models and may contain errors</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• North is not a substitute for professional advice (medical, legal, financial, etc.)</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• You are responsible for evaluating and acting on AI suggestions</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• We do not guarantee the accuracy or completeness of AI responses</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• AI coaches should not be used for emergency situations</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Intellectual Property</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Ownership:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• You retain ownership of your user content (context, messages, custom coaches)</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• We retain ownership of the App, default coaches, and all related IP</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• You grant us a license to use your content to provide the service</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• We may use anonymized data for analytics and improvements</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Data and Privacy</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Your privacy is important to us. Please review our Privacy Policy for details on how we collect, use, and protect your data. By using North, you consent to our data practices as described in the Privacy Policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Termination</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We may suspend or terminate your account if:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• You violate these Terms</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• You engage in fraudulent activity</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Required by law</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• We discontinue the service</Text>
        
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You may delete your account at any time from Settings. Upon termination, your data will be deleted as described in our Privacy Policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Disclaimers</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We do not guarantee:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Uninterrupted or error-free service</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Accuracy of AI responses</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Specific results from using the App</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Limitation of Liability</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Our total liability shall not exceed the amount you paid for the service in the 12 months preceding the claim.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Changes to Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We may modify these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use of the App after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>13. Governing Law</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in the courts of [Your Jurisdiction].
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>14. Contact Information</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          For questions about these Terms, contact us at:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Email: support@northapp.com</Text>
        <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• In-app: Settings → Support</Text>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By using North, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
