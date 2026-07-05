import 'package:flutter/services.dart';

/// Nettoie un numéro de téléphone : ne garde que les chiffres.
/// Ex: "07 00 00 00 00" → "0700000000"
String cleanPhone(String phone) {
  return phone.replaceAll(RegExp(r'[^0-9]'), '');
}

/// Valide qu'un numéro de téléphone contient assez de chiffres.
/// Côte d'Ivoire : 10 chiffres (ex: 0700000000)
bool isValidPhone(String phone) {
  final digits = cleanPhone(phone);
  return digits.length >= 8 && digits.length <= 15;
}

/// TextInputFormatter qui ne permet de saisir que des chiffres,
/// sans espaces ni aucun autre caractère.
class PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Ne garder que les chiffres
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Limiter à 15 chiffres
    final truncated = digits.length > 15 ? digits.substring(0, 15) : digits;

    // Calculer la position du curseur
    final selectionIndex = newValue.selection.baseOffset;
    int digitCount = 0;
    for (var i = 0; i < newValue.text.length && i < selectionIndex; i++) {
      if (RegExp(r'[0-9]').hasMatch(newValue.text[i])) {
        digitCount++;
      }
    }
    final newSelection = digitCount > truncated.length ? truncated.length : digitCount;

    return TextEditingValue(
      text: truncated,
      selection: TextSelection.collapsed(offset: newSelection),
    );
  }
}