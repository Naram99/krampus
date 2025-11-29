import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { AppSettings, Currency, Language } from "../../types";
import { getSettings, saveSettings } from "../../utils/storage";
import { getCurrencySymbol } from "../../utils/currency";
import { t } from "../../utils/i18n";
import { colors } from "../../utils/theme";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    globalBudgetLimit: 0,
    defaultPriceLimit: 50,
    notificationsEnabled: false,
    currency: 'USD',
    language: 'en',
  });
  const [globalBudgetInput, setGlobalBudgetInput] = useState("");
  const [defaultPriceInput, setDefaultPriceInput] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await getSettings();
    setSettings(loadedSettings);
    setGlobalBudgetInput(
      loadedSettings.globalBudgetLimit > 0
        ? loadedSettings.globalBudgetLimit.toString()
        : ""
    );
    setDefaultPriceInput(loadedSettings.defaultPriceLimit.toString());
  };

  const handleSave = async () => {
    const globalBudget = parseFloat(globalBudgetInput) || 0;
    const defaultPrice = parseFloat(defaultPriceInput) || 50;

    if (defaultPrice <= 0) {
      Alert.alert("Error", t("settings.errorPrice"));
      return;
    }

    const updatedSettings: AppSettings = {
      globalBudgetLimit: globalBudget,
      defaultPriceLimit: defaultPrice,
      notificationsEnabled: settings.notificationsEnabled,
      currency: settings.currency,
      language: settings.language,
    };

    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    Alert.alert("Success", t("settings.saveSuccess"));
  };

  const toggleNotifications = async (value: boolean) => {
    const updatedSettings: AppSettings = {
      ...settings,
      notificationsEnabled: value,
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleCurrencyChange = async (currency: Currency) => {
    const updatedSettings: AppSettings = {
      ...settings,
      currency,
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleLanguageChange = async (language: Language) => {
    const updatedSettings: AppSettings = {
      ...settings,
      language,
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.budgetSettings")}</Text>

        <View style={styles.settingItem}>
          <Text style={styles.label}>{t("settings.globalBudgetLimit")}</Text>
          <Text style={styles.description}>
            {t("settings.globalBudgetDescription")}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={globalBudgetInput}
              onChangeText={setGlobalBudgetInput}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>{t("settings.defaultPriceLimit")}</Text>
          <Text style={styles.description}>
            {t("settings.defaultPriceDescription")}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <TextInput
              style={styles.input}
              placeholder="50.00"
              keyboardType="numeric"
              value={defaultPriceInput}
              onChangeText={setDefaultPriceInput}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>{t("settings.currency")}</Text>
          <Text style={styles.description}>
            {t("settings.currencyDescription")}
          </Text>
          <View style={styles.currencyContainer}>
            {(['USD', 'EUR', 'HUF'] as Currency[]).map((currency) => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyButton,
                  settings.currency === currency && styles.currencyButtonActive,
                ]}
                onPress={() => handleCurrencyChange(currency)}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    settings.currency === currency &&
                      styles.currencyButtonTextActive,
                  ]}
                >
                  {currency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>

        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.label}>{t("settings.enableNotifications")}</Text>
              <Text style={styles.description}>
                {t("settings.notificationsDescription")}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#ddd", true: "#007AFF" }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>

        <View style={styles.settingItem}>
          <Text style={styles.label}>{t("settings.language")}</Text>
          <Text style={styles.description}>
            {t("settings.languageDescription")}
          </Text>
          <View style={styles.currencyContainer}>
            {(['en', 'de', 'hu'] as Language[]).map((language) => (
              <TouchableOpacity
                key={language}
                style={[
                  styles.currencyButton,
                  settings.language === language && styles.currencyButtonActive,
                ]}
                onPress={() => handleLanguageChange(language)}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    settings.language === language &&
                      styles.currencyButtonTextActive,
                  ]}
                >
                  {language.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{t("settings.saveSettings")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.christmasRed,
    shadowColor: colors.darkRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.christmasRed,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.darkBrown,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.gingerbread,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    borderRadius: 8,
    backgroundColor: colors.snow,
  },
  currencySymbol: {
    fontSize: 18,
    color: colors.darkBrown,
    paddingLeft: 12,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.darkBrown,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  saveButton: {
    backgroundColor: colors.christmasGreen,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 2,
    borderColor: colors.christmasRed,
    shadowColor: colors.darkRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  currencyContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  currencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gingerbread,
    backgroundColor: colors.snow,
    alignItems: "center",
  },
  currencyButtonActive: {
    borderColor: colors.christmasRed,
    backgroundColor: colors.christmasRed,
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.darkBrown,
  },
  currencyButtonTextActive: {
    color: colors.white,
  },
});

