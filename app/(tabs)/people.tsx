import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Person, AppSettings } from "../../types";
import { getPeople, savePeople, getSettings } from "../../utils/storage";
import { formatCurrency, getCurrencySymbol } from "../../utils/currency";
import { t } from "../../utils/i18n";
import { colors } from "../../utils/theme";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    presentType: "",
    presentName: "",
    priceLimit: "",
  });

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

  const resetForm = () => {
    setFormData({
      name: "",
      presentType: "",
      presentName: "",
      priceLimit: settings?.defaultPriceLimit.toString() || "50",
    });
    setEditingPerson(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      presentType: person.presentType,
      presentName: person.presentName,
      priceLimit: person.priceLimit.toString(),
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", t("people.errorName"));
      return;
    }
    if (!formData.presentType.trim()) {
      Alert.alert("Error", t("people.errorType"));
      return;
    }
    if (!formData.priceLimit || parseFloat(formData.priceLimit) <= 0) {
      Alert.alert("Error", t("people.errorPrice"));
      return;
    }

    const priceLimit = parseFloat(formData.priceLimit);

    if (editingPerson) {
      // Update existing person
      const updatedPeople = people.map((p) =>
        p.id === editingPerson.id
          ? {
              ...p,
              name: formData.name.trim(),
              presentType: formData.presentType.trim(),
              presentName: formData.presentName.trim(),
              priceLimit,
            }
          : p
      );
      setPeople(updatedPeople);
      await savePeople(updatedPeople);
    } else {
      // Add new person
      const newPerson: Person = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        presentType: formData.presentType.trim(),
        presentName: formData.presentName.trim(),
        priceLimit,
        isBought: false,
      };
      const updatedPeople = [...people, newPerson];
      setPeople(updatedPeople);
      await savePeople(updatedPeople);
    }

    closeModal();
  };

  const handleDelete = (person: Person) => {
    Alert.alert(
      t("people.deleteConfirm"),
      `${t("people.deleteMessage")} ${person.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedPeople = people.filter((p) => p.id !== person.id);
            setPeople(updatedPeople);
            await savePeople(updatedPeople);
          },
        },
      ]
    );
  };

  const currency = settings?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const renderPersonItem = ({ item }: { item: Person }) => (
    <View style={styles.personCard}>
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{item.name}</Text>
        <Text style={styles.personDetails}>
          {t("people.type")} {item.presentType} | {t("people.limit")} {formatCurrency(item.priceLimit, currency)}
        </Text>
        {item.presentName && (
          <Text style={styles.presentName}>{t("people.present")} {item.presentName}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={people}
        renderItem={renderPersonItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t("people.emptyMessage")}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingPerson ? t("people.editPerson") : t("people.addPerson")}
            </Text>

            <Text style={styles.label}>{t("people.name")} *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("people.name")}
              value={formData.name}
              onChangeText={(text) =>
                setFormData({ ...formData, name: text })
              }
            />

            <Text style={styles.label}>{t("people.presentType")} *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("people.presentTypePlaceholder")}
              value={formData.presentType}
              onChangeText={(text) =>
                setFormData({ ...formData, presentType: text })
              }
            />

            <Text style={styles.label}>{t("people.presentName")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("people.presentNamePlaceholder")}
              value={formData.presentName}
              onChangeText={(text) =>
                setFormData({ ...formData, presentName: text })
              }
            />

            <Text style={styles.label}>{t("people.priceLimit")} *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("people.priceLimitPlaceholder")}
                keyboardType="numeric"
                value={formData.priceLimit}
                onChangeText={(text) =>
                  setFormData({ ...formData, priceLimit: text })
                }
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>{t("people.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>{t("people.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  personCard: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    shadowColor: colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.darkBrown,
    marginBottom: 4,
  },
  personDetails: {
    fontSize: 14,
    color: colors.gingerbread,
    marginBottom: 4,
  },
  presentName: {
    fontSize: 14,
    color: colors.christmasRed,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    color: colors.darkBrown,
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
    backgroundColor: "transparent",
  },
  modalInput: {
    borderWidth: 2,
    borderColor: colors.christmasGreen,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.snow,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

