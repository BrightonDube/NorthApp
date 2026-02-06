/**
 * Privacy Policy Screen
 * 
 * Displays the privacy policy for the North mobile app.
 * Required for App Store compliance.
 * 
 * Validates: Requirements 20.6
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: February 2, 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to North ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect the following types of information:
        </Text>
        <Text style={styles.bulletPoint}>• Account Information: Email address, name, and authentication credentials</Text>
        <Text style={styles.bulletPoint}>• User Content: Context items (values, goals, projects, constraints), custom coaches, and chat messages</Text>
        <Text style={styles.bulletPoint}>• Usage Data: App interactions, feature usage, and performance metrics</Text>
        <Text style={styles.bulletPoint}>• Device Information: Device type, operating system, and app version</Text>
        <Text style={styles.bulletPoint}>• Subscription Data: Purchase history and subscription status (managed by RevenueCat)</Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide and maintain the North service</Text>
        <Text style={styles.bulletPoint}>• Personalize your AI coaching experience</Text>
        <Text style={styles.bulletPoint}>• Process subscription payments</Text>
        <Text style={styles.bulletPoint}>• Improve app performance and features</Text>
        <Text style={styles.bulletPoint}>• Send important service updates</Text>
        <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>

        <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely using industry-standard encryption:
        </Text>
        <Text style={styles.bulletPoint}>• All data is encrypted in transit using TLS 1.3</Text>
        <Text style={styles.bulletPoint}>• Data at rest is encrypted using AES-256</Text>
        <Text style={styles.bulletPoint}>• Authentication tokens are stored securely on your device</Text>
        <Text style={styles.bulletPoint}>• We use Supabase for backend services with Row Level Security (RLS)</Text>

        <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use the following third-party services:
        </Text>
        <Text style={styles.bulletPoint}>• Supabase: Database and authentication</Text>
        <Text style={styles.bulletPoint}>• Google Gemini: AI model for coaching responses</Text>
        <Text style={styles.bulletPoint}>• RevenueCat: Subscription management</Text>
        <Text style={styles.bulletPoint}>• Google/Apple: OAuth authentication</Text>

        <Text style={styles.sectionTitle}>6. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal data. We only share data with:
        </Text>
        <Text style={styles.bulletPoint}>• Service providers necessary to operate the app</Text>
        <Text style={styles.bulletPoint}>• Law enforcement when legally required</Text>
        <Text style={styles.bulletPoint}>• Your AI coaches (your context is used to personalize responses)</Text>

        <Text style={styles.sectionTitle}>7. Your Rights (GDPR & CCPA)</Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal data</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
        <Text style={styles.bulletPoint}>• Delete your account and data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>• Opt-out of data collection (where applicable)</Text>
        <Text style={styles.bulletPoint}>• Withdraw consent at any time</Text>

        <Text style={styles.sectionTitle}>8. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your data for as long as your account is active. When you delete your account:
        </Text>
        <Text style={styles.bulletPoint}>• All personal data is permanently deleted within 30 days</Text>
        <Text style={styles.bulletPoint}>• Anonymized usage data may be retained for analytics</Text>
        <Text style={styles.bulletPoint}>• Subscription records are retained as required by law</Text>

        <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          North is not intended for users under 13 years of age. We do not knowingly collect data from children under 13.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this privacy policy from time to time. We will notify you of significant changes via email or in-app notification.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this privacy policy or want to exercise your rights, contact us at:
        </Text>
        <Text style={styles.bulletPoint}>• Email: privacy@northapp.com</Text>
        <Text style={styles.bulletPoint}>• In-app: Settings → Support</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using North, you agree to this privacy policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#09090B',
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
    color: '#71717A',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#3F3F46',
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#3F3F46',
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  footerText: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
