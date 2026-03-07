/**
 * Modal Component Examples
 * 
 * Demonstrates various use cases for the Modal component
 * following the Calm Design System.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Input } from './Input';

/**
 * Example 1: Simple Confirmation Modal
 */
export function ConfirmationModalExample() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    console.log('Confirmed!');
    setShowConfirm(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setShowConfirm(true)}
        className="bg-brand-primary rounded-md py-4 px-6"
      >
        <Text className="text-button text-brand-inverse">Show Confirmation</Text>
      </Pressable>

      <Modal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
      >
        <Text className="text-h2 font-semibold text-text-primary mb-2">
          Confirm Action
        </Text>
        <Text className="text-body text-text-secondary mb-6">
          Are you sure you want to proceed with this action?
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setShowConfirm(false)}
            className="flex-1 bg-surface rounded-md py-4 items-center"
          >
            <Text className="text-button text-text-primary">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            className="flex-1 bg-brand-primary rounded-md py-4 items-center"
          >
            <Text className="text-button text-brand-inverse">Confirm</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Example 2: Form Modal with Keyboard Handling
 */
export function FormModalExample() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    console.log('Submitted:', { name, description });
    setShowForm(false);
    setName('');
    setDescription('');
  };

  return (
    <View>
      <Pressable
        onPress={() => setShowForm(true)}
        className="bg-brand-primary rounded-md py-4 px-6"
      >
        <Text className="text-button text-brand-inverse">Add Item</Text>
      </Pressable>

      <Modal
        visible={showForm}
        onClose={() => setShowForm(false)}
        keyboardAvoiding={true}
      >
        <Text className="text-h2 font-semibold text-text-primary mb-4">
          Add New Item
        </Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Enter name"
          className="mb-4"
        />
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          multiline
          numberOfLines={4}
          className="mb-6"
        />
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setShowForm(false)}
            className="flex-1 bg-surface rounded-md py-4 items-center"
          >
            <Text className="text-button text-text-primary">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            className="flex-1 bg-brand-primary rounded-md py-4 items-center"
          >
            <Text className="text-button text-brand-inverse">Submit</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Example 3: Loading Modal (Non-Dismissible)
 */
export function LoadingModalExample() {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartLoading = () => {
    setIsLoading(true);
    // Simulate async operation
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  return (
    <View>
      <Pressable
        onPress={handleStartLoading}
        className="bg-brand-primary rounded-md py-4 px-6"
      >
        <Text className="text-button text-brand-inverse">Start Loading</Text>
      </Pressable>

      <Modal
        visible={isLoading}
        onClose={() => {}}
        backdropDismissible={false}
      >
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#292524" />
          <Text className="text-body text-text-secondary mt-4">
            Processing your request...
          </Text>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Example 4: Alert Modal with Icon
 */
export function AlertModalExample() {
  const [showAlert, setShowAlert] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setShowAlert(true)}
        className="bg-error rounded-md py-4 px-6"
      >
        <Text className="text-button text-white">Show Alert</Text>
      </Pressable>

      <Modal
        visible={showAlert}
        onClose={() => setShowAlert(false)}
        backdropOpacity={0.7}
      >
        <View className="items-center">
          <View className="w-16 h-16 rounded-full bg-error items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={32} color="#FFFFFF" />
          </View>
          <Text className="text-h2 font-semibold text-text-primary mb-2">
            Error Occurred
          </Text>
          <Text className="text-body text-text-secondary text-center mb-6">
            Something went wrong while processing your request. Please try again.
          </Text>
          <Pressable
            onPress={() => setShowAlert(false)}
            className="bg-brand-primary rounded-md py-4 px-8"
          >
            <Text className="text-button text-brand-inverse">OK</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Example 5: Success Modal with Icon
 */
export function SuccessModalExample() {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setShowSuccess(true)}
        className="bg-success rounded-md py-4 px-6"
      >
        <Text className="text-button text-white">Show Success</Text>
      </Pressable>

      <Modal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
      >
        <View className="items-center">
          <View className="w-16 h-16 rounded-full bg-success items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
          </View>
          <Text className="text-h2 font-semibold text-text-primary mb-2">
            Success!
          </Text>
          <Text className="text-body text-text-secondary text-center mb-6">
            Your changes have been saved successfully.
          </Text>
          <Pressable
            onPress={() => setShowSuccess(false)}
            className="bg-brand-primary rounded-md py-4 px-8"
          >
            <Text className="text-button text-brand-inverse">Continue</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Example 6: Modal with Scrollable Content
 */
export function ScrollableModalExample() {
  const [showDetails, setShowDetails] = useState(false);

  const longContent = `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
    exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
    fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
    culpa qui officia deserunt mollit anim id est laborum.
    
    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
    laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
    architecto beatae vitae dicta sunt explicabo.
    
    Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia 
    consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
  `.trim();

  return (
    <View>
      <Pressable
        onPress={() => setShowDetails(true)}
        className="bg-brand-primary rounded-md py-4 px-6"
      >
        <Text className="text-button text-brand-inverse">Show Details</Text>
      </Pressable>

      <Modal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
      >
        <Text className="text-h2 font-semibold text-text-primary mb-4">
          Details
        </Text>
        <ScrollView
          className="max-h-96"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-body text-text-secondary leading-6">
            {longContent}
          </Text>
        </ScrollView>
        <Pressable
          onPress={() => setShowDetails(false)}
          className="bg-brand-primary rounded-md py-4 items-center mt-6"
        >
          <Text className="text-button text-brand-inverse">Close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * Example 7: Choice Modal (Multiple Options)
 */
export function ChoiceModalExample() {
  const [showChoice, setShowChoice] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'option1', label: 'Option 1', description: 'First choice' },
    { id: 'option2', label: 'Option 2', description: 'Second choice' },
    { id: 'option3', label: 'Option 3', description: 'Third choice' },
  ];

  const handleSelect = (id: string) => {
    setSelected(id);
    setShowChoice(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setShowChoice(true)}
        className="bg-brand-primary rounded-md py-4 px-6"
      >
        <Text className="text-button text-brand-inverse">
          {selected ? `Selected: ${selected}` : 'Make a Choice'}
        </Text>
      </Pressable>

      <Modal
        visible={showChoice}
        onClose={() => setShowChoice(false)}
      >
        <Text className="text-h2 font-semibold text-text-primary mb-4">
          Choose an Option
        </Text>
        <View className="gap-3 mb-6">
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => handleSelect(option.id)}
              className="bg-surface rounded-lg p-4 border border-border-subtle active:bg-surface-highlight"
            >
              <Text className="text-body font-semibold text-text-primary mb-1">
                {option.label}
              </Text>
              <Text className="text-sub text-text-secondary">
                {option.description}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setShowChoice(false)}
          className="bg-surface rounded-md py-4 items-center"
        >
          <Text className="text-button text-text-primary">Cancel</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * Example 8: Delete Confirmation Modal
 */
export function DeleteConfirmationExample() {
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = () => {
    console.log('Item deleted');
    setShowDelete(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setShowDelete(true)}
        className="bg-error rounded-md py-4 px-6"
      >
        <Text className="text-button text-white">Delete Item</Text>
      </Pressable>

      <Modal
        visible={showDelete}
        onClose={() => setShowDelete(false)}
      >
        <View className="items-center">
          <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-4">
            <Ionicons name="trash" size={32} color="#FF453A" />
          </View>
          <Text className="text-h2 font-semibold text-text-primary mb-2">
            Delete Item?
          </Text>
          <Text className="text-body text-text-secondary text-center mb-6">
            This action cannot be undone. Are you sure you want to delete this item?
          </Text>
          <View className="flex-row gap-3 w-full">
            <Pressable
              onPress={() => setShowDelete(false)}
              className="flex-1 bg-surface rounded-md py-4 items-center"
            >
              <Text className="text-button text-text-primary">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="flex-1 bg-error rounded-md py-4 items-center"
            >
              <Text className="text-button text-white">Delete</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * All Examples in One Screen
 */
export function AllModalExamples() {
  return (
    <ScrollView className="flex-1 bg-background p-6">
      <Text className="text-h1 font-bold text-text-primary mb-6">
        Modal Examples
      </Text>
      
      <View className="gap-4">
        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            1. Confirmation Modal
          </Text>
          <ConfirmationModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            2. Form Modal
          </Text>
          <FormModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            3. Loading Modal
          </Text>
          <LoadingModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            4. Alert Modal
          </Text>
          <AlertModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            5. Success Modal
          </Text>
          <SuccessModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            6. Scrollable Modal
          </Text>
          <ScrollableModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            7. Choice Modal
          </Text>
          <ChoiceModalExample />
        </View>

        <View>
          <Text className="text-body font-semibold text-text-primary mb-2">
            8. Delete Confirmation
          </Text>
          <DeleteConfirmationExample />
        </View>
      </View>
    </ScrollView>
  );
}
