/**
 * Input Component Examples
 * 
 * Visual examples of the Input component in various states and configurations.
 * Use this file as a reference for implementing inputs in your screens.
 */

import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { Input } from './Input';

/**
 * Example: Basic Input
 */
export function BasicInputExample() {
  const [value, setValue] = useState('');

  return (
    <Input
      label="Email"
      placeholder="you@example.com"
      value={value}
      onChangeText={setValue}
      keyboardType="email-address"
      autoCapitalize="none"
    />
  );
}

/**
 * Example: Input with Error
 */
export function InputWithErrorExample() {
  const [email, setEmail] = useState('invalid-email');
  const [error, setError] = useState('Please enter a valid email address');

  const validateEmail = (value: string) => {
    if (!value.includes('@')) {
      setError('Please enter a valid email address');
    } else {
      setError('');
    }
  };

  return (
    <Input
      label="Email"
      placeholder="you@example.com"
      value={email}
      onChangeText={setEmail}
      onBlur={() => validateEmail(email)}
      error={error}
      keyboardType="email-address"
    />
  );
}

/**
 * Example: Input with Helper Text
 */
export function InputWithHelperTextExample() {
  const [password, setPassword] = useState('');

  return (
    <Input
      label="Password"
      placeholder="Enter your password"
      value={password}
      onChangeText={setPassword}
      secureTextEntry
      helperText="Must be at least 8 characters with one number"
    />
  );
}

/**
 * Example: Multiline Input
 */
export function MultilineInputExample() {
  const [bio, setBio] = useState('');

  return (
    <Input
      label="Bio"
      placeholder="Tell us about yourself..."
      value={bio}
      onChangeText={setBio}
      multiline
      numberOfLines={4}
      helperText={`${bio.length}/500 characters`}
      maxLength={500}
    />
  );
}

/**
 * Example: Disabled Input
 */
export function DisabledInputExample() {
  return (
    <Input
      label="Username"
      value="john_doe"
      editable={false}
      helperText="Username cannot be changed"
    />
  );
}

/**
 * Example: Phone Number Input
 */
export function PhoneInputExample() {
  const [phone, setPhone] = useState('');

  return (
    <Input
      label="Phone Number"
      placeholder="+1 (555) 123-4567"
      value={phone}
      onChangeText={setPhone}
      keyboardType="phone-pad"
      helperText="We'll never share your phone number"
    />
  );
}

/**
 * Example: Number Input
 */
export function NumberInputExample() {
  const [age, setAge] = useState('');

  return (
    <Input
      label="Age"
      placeholder="25"
      value={age}
      onChangeText={setAge}
      keyboardType="number-pad"
      maxLength={3}
    />
  );
}

/**
 * Example: Search Input
 */
export function SearchInputExample() {
  const [search, setSearch] = useState('');

  return (
    <Input
      placeholder="Search coaches..."
      value={search}
      onChangeText={setSearch}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

/**
 * Example: Form with Multiple Inputs
 */
export function FormExample() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <View className="gap-4">
      <Input
        label="Name"
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />

      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />

      <Input
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={errors.password}
        helperText={!errors.password ? 'Must be at least 8 characters' : undefined}
      />

      <Input
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={errors.confirmPassword}
      />
    </View>
  );
}

/**
 * Example: All Input States Showcase
 */
export function InputShowcase() {
  return (
    <ScrollView className="flex-1 bg-background p-6">
      <Text className="text-h1 font-semibold mb-6 text-text-primary">
        Input Component Examples
      </Text>

      <View className="gap-8">
        {/* Basic Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Basic Input
          </Text>
          <BasicInputExample />
        </View>

        {/* Input with Error */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Input with Error
          </Text>
          <InputWithErrorExample />
        </View>

        {/* Input with Helper Text */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Input with Helper Text
          </Text>
          <InputWithHelperTextExample />
        </View>

        {/* Multiline Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Multiline Input
          </Text>
          <MultilineInputExample />
        </View>

        {/* Disabled Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Disabled Input
          </Text>
          <DisabledInputExample />
        </View>

        {/* Phone Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Phone Number Input
          </Text>
          <PhoneInputExample />
        </View>

        {/* Number Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Number Input
          </Text>
          <NumberInputExample />
        </View>

        {/* Search Input */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Search Input
          </Text>
          <SearchInputExample />
        </View>

        {/* Complete Form */}
        <View>
          <Text className="text-h2 font-medium mb-4 text-text-primary">
            Complete Form
          </Text>
          <FormExample />
        </View>
      </View>
    </ScrollView>
  );
}
