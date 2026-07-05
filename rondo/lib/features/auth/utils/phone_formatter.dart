import 'package:flutter/services.dart';

/// Formate un numéro de téléphone : ne garde que les chiffres,
/// et insère des espaces par groupes de 2 pour la lisibilité.
/// Ex: "07 00 00 00 00" → "07 00 00 00 00"
/// Ex: "07000000000" → "07 00 00 00 00"
String formatPhoneDisplay(String phone) {
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && i % 2 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

/// Nettoie un numéro de téléphone pour le pseudo-email :
/// ne garde que les chiffres.
/// Ex: "07 00 00 00 00" → "0700000000"
String cleanPhone(String phone) {
  return phone.replaceAll(RegExp(r'[^0-9]'), '');
}

/// Valide qu'un numéro de téléphone contient assez de chiffres.
/// Côte d'Ivoire : 10 chiffres (ex: 07 00 00 00 00)
bool isValidPhone(String phone) {
  final digits = cleanPhone(phone);
  return digits.length >= 8 && digits.length <= 15;
}

/// TextInputFormatter qui ne permet de saisir que des chiffres
/// et des espaces, et formate automatiquement par groupes de 2.
class PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Ne garder que les chiffres
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Limiter à 15 chiffres (suffisant pour tous les formats ouest-africains)
    final truncated = digits.length > 15 ? digits.substring(0, 15) : digits;

    // Formater par groupes de 2
    final buffer = StringBuffer();
    for (var i = 0; i < truncated.length; i++) {
      if (i > 0 && i % 2 == 0) buffer.write(' ');
      buffer.write(truncated[i]);
    }

    final formatted = buffer.toString();

    // Calculer la position du curseur
    final selectionIndex = newValue.selection.baseOffset;
    int digitCount = 0;
    int newSelectionIndex = 0;
    for (var i = 0; i < newValue.text.length && i < selectionIndex; i++) {
      if (RegExp(r'[0-9]').hasMatch(newValue.text[i])) {
        digitCount++;
      }
    }
    // Reconstruire la position dans le texte formaté
    for (var i = 0; i < formatted.length && digitCount > 0; i++) {
      if (RegExp(r'[0-9]').hasMatch(formatted[i])) {
        digitCount--;
      }
      newSelectionIndex = i + 1;
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: newSelectionIndex),
    );
  }
}