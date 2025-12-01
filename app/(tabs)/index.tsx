import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppSettings, Person } from "../../types";
import { formatCurrency, getCurrencySymbol } from "../../utils/currency";
import { t } from "../../utils/i18n";
import { getPeople, getSettings, savePeople } from "../../utils/storage";
import { colors } from "../../utils/theme";

export default function MainPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [checkingPerson, setCheckingPerson] = useState<Person | null>(null);
  const [priceInput, setPriceInput] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [peopleData, settingsData] = await Promise.all([
      getPeople(),
      getSettings(),
    ]);
    setPeople(peopleData);
    setSettings(settingsData);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckItem = (person: Person) => {
    if (person.isBought) {
      // If already bought, uncheck it
      const updatedPeople = people.map((p) =>
        p.id === person.id ? { ...p, isBought: false, actualPrice: undefined } : p
      );
      setPeople(updatedPeople);
      savePeople(updatedPeople);
    } else {
      // If not bought, show modal to enter price
      setCheckingPerson(person);
      setPriceInput("");
      setPriceModalVisible(true);
    }
  };

  const handleSavePrice = async () => {
    if (!checkingPerson) return;

    const priceNum = parseFloat(priceInput) || 0;

    const updatedPeople = people.map((person) =>
      person.id === checkingPerson.id
        ? { ...person, isBought: true, actualPrice: priceNum }
        : person
    );
    setPeople(updatedPeople);
    await savePeople(updatedPeople);
    setPriceModalVisible(false);
    setCheckingPerson(null);
    setPriceInput("");
  };

  const handleCancelPrice = () => {
    setPriceModalVisible(false);
    setCheckingPerson(null);
    setPriceInput("");
  };

  const updateActualPrice = async (personId: string, price: string) => {
    const priceNum = parseFloat(price) || 0;
    const updatedPeople = people.map((person) =>
      person.id === personId ? { ...person, actualPrice: priceNum } : person
    );
    setPeople(updatedPeople);
    await savePeople(updatedPeople);
  };

  const calculateStats = () => {
    const totalPeople = people.length;
    const boughtCount = people.filter((p) => p.isBought).length;
    const percentage = totalPeople > 0 ? (boughtCount / totalPeople) * 100 : 0;
    const totalSpent = people
      .filter((p) => p.isBought && p.actualPrice)
      .reduce((sum, p) => sum + (p.actualPrice || 0), 0);
    const globalLimit = settings?.globalBudgetLimit || 0;
    const isOverBudget = globalLimit > 0 && totalSpent > globalLimit;

    return { totalPeople, boughtCount, percentage, totalSpent, globalLimit, isOverBudget };
  };

  const stats = calculateStats();

  // Sort people: unbought first, then bought
  const sortedPeople = [...people].sort((a, b) => {
    if (a.isBought === b.isBought) return 0;
    return a.isBought ? 1 : -1;
  });

  const currency = settings?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const renderPersonItem = ({ item }: { item: Person }) => (
    <View style={[styles.personCard, item.isBought && styles.personCardBought]}>
      <View style={styles.personHeader}>
        <Text style={styles.personName}>{item.name}</Text>
        <TouchableOpacity
          style={[
            styles.checkbox,
            item.isBought && styles.checkboxChecked,
          ]}
          onPress={() => handleCheckItem(item)}
        >
          {item.isBought && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </View>
      <Text style={styles.presentInfo}>
        {item.presentName
          ? `${t("main.present")} ${item.presentName}`
          : `${t("main.category")} ${item.presentType}`}
      </Text>
      <Text style={styles.priceLimit}>
        {t("main.priceLimit")} {formatCurrency(item.priceLimit, currency)}
      </Text>
      {item.isBought && (
        <View style={styles.priceInputContainer}>
          <Text style={styles.priceLabel}>
            {t("main.actualPrice")} {currencySymbol}
          </Text>
          <TextInput
            style={styles.priceInput}
            keyboardType="numeric"
            placeholder="0.00"
            value={item.actualPrice?.toString() || ""}
            onChangeText={(text) => updateActualPrice(item.id, text)}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.dashboard}>
        <Text style={styles.dashboardTitle}>{t("main.dashboard")}</Text>
        <Text style={styles.statText}>
          {stats.boughtCount}/{stats.totalPeople} {t("main.presentsBought")} -{" "}
          {stats.percentage.toFixed(0)}%
        </Text>
        {stats.globalLimit > 0 && (
          <View style={styles.budgetContainer}>
            <Text style={styles.budgetLabel}>{t("main.budgetStatus")}</Text>
            <Text
              style={[
                styles.budgetText,
                stats.isOverBudget ? styles.budgetOver : styles.budgetUnder,
              ]}
            >
              {formatCurrency(stats.totalSpent, currency)} / {formatCurrency(stats.globalLimit, currency)}
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={sortedPeople}
        renderItem={renderPersonItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t("main.emptyMessage")}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={priceModalVisible}
        transparent={true}
        onRequestClose={handleCancelPrice}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {checkingPerson ? `${t("main.actualPrice")} - ${checkingPerson.name}` : ""}
              </Text>
              <Text style={styles.modalDescription}>
                {t("main.priceLimit")} {checkingPerson ? formatCurrency(checkingPerson.priceLimit, currency) : ""}
              </Text>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={priceInput}
                  onChangeText={setPriceInput}
                  autoFocus={true}
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCancelPrice}
                >
                  <Text style={styles.modalCancelButtonText}>{t("people.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton]}
                  onPress={handleSavePrice}
                >
                  <Text style={styles.modalSaveButtonText}>{t("people.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  dashboard: {
    backgroundColor: colors.white,
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.christmasRed,
    shadowColor: colors.darkRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: colors.christmasRed,
  },
  statText: {
    fontSize: 18,
    marginBottom: 8,
    color: colors.darkBrown,
  },
  budgetContainer: {
    marginTop: 8,
  },
  budgetLabel: {
    fontSize: 16,
    color: colors.darkBrown,
    marginBottom: 4,
  },
  budgetText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  budgetOver: {
    color: colors.christmasRed,
  },
  budgetUnder: {
    color: colors.christmasGreen,
  },
  listContent: {
    padding: 16,
  },
  personCard: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    shadowColor: colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  personCardBought: {
    opacity: 0.5,
    borderColor: colors.gingerbread,
  },
  personHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  personName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.darkBrown,
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.christmasGreen,
  },
  checkmark: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  presentInfo: {
    fontSize: 16,
    color: colors.darkBrown,
    marginBottom: 4,
  },
  priceLimit: {
    fontSize: 14,
    color: colors.gingerbread,
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.christmasGreen,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.darkBrown,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    backgroundColor: colors.snow,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    borderWidth: 3,
    borderColor: colors.christmasRed,
    alignSelf: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.christmasRed,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.darkBrown,
    marginBottom: 16,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    borderRadius: 8,
    backgroundColor: colors.snow,
    marginBottom: 20,
  },
  modalCurrencySymbol: {
    fontSize: 18,
    color: colors.darkBrown,
    paddingLeft: 12,
    paddingRight: 8,
  },
  modalInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    flexShrink: 1,
  },
  modalCancelButton: {
    backgroundColor: colors.lightGray,
    borderWidth: 2,
    borderColor: colors.gingerbread,
  },
  modalCancelButtonText: {
    color: colors.darkBrown,
    fontSize: 16,
    fontWeight: "600",
  },
  modalSaveButton: {
    backgroundColor: colors.christmasGreen,
  },
  modalSaveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

