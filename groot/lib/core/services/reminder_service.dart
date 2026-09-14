import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

/// Rappels locaux — expliqués AVANT la popup système, jamais brutaux
/// (brief §6.A.7). Un rappel par habitude qui porte un reminder_time.
class ReminderService {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    // Web : pas de notifications programmées hors de l'app — on ne
    // touche jamais au plugin natif, tout reste en no-op silencieux.
    if (kIsWeb) {
      _initialized = true;
      return;
    }
    tz.initializeTimeZones();

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: androidInit,
        iOS: iosInit,
      ),
    );
    _initialized = true;
  }

  /// Demande la permission au moment où l'onboarding l'explique (§6.A.7),
  /// jamais au premier lancement à froid.
  Future<bool> requestPermissions() async {
    await initialize();
    if (kIsWeb) return false; // pas de rappels programmables en web
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      return await ios?.requestPermissions(alert: true, badge: true, sound: true) ?? false;
    }
    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      return await android?.requestNotificationsPermission() ?? false;
    }
    return false;
  }

  /// Programme le rappel quotidien d'une habitude.
  /// [habitClientId] sert d'identifiant de notification — remplacer un
  /// rappel = reprogrammer le même id, pas en empiler un nouveau.
  Future<void> scheduleDailyReminder({
    required String habitClientId,
    required String habitName,
    required String timeOfDay, // 'HH:MM'
  }) async {
    await initialize();
    // Web : initialize() a déjà court-circuité, on ne va pas plus loin.
    if (kIsWeb) return;
    final parts = timeOfDay.split(':');
    final hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);

    final androidDetails = AndroidNotificationDetails(
      'groot_reminders',
      'Rappels d\u2019habitudes',
      channelDescription: 'Tes habitudes du jour, en douceur',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      // Jamais de rouge agressif — l'icône reste dans la gamme verte.
      color: const Color(0xFF5E8B5A),
    );
    const iosDetails = DarwinNotificationDetails();
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.zonedSchedule(
      id: _stableId(habitClientId),
      title: habitName,
      body: 'Groot t\u2019attend \u2014 $habitName',
      scheduledDate: _nextOccurrence(hour, minute),
      notificationDetails: details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  /// Annule le rappel d'une habitude (gel, suppression, heure retirée).
  Future<void> cancelReminder(String habitClientId) async {
    await initialize();
    if (kIsWeb) return;
    await _plugin.cancel(id: _stableId(habitClientId));
  }

  /// Identifiant entier stable dérivé du client_id : les notifications
  /// natives exigent un int, nos habitudes un uuid. Hash FNV-1a 32 bits.
  int _stableId(String clientId) {
    var hash = 0x811c9dc5;
    for (final c in clientId.codeUnits) {
      hash ^= c;
      hash = (hash * 0x01000193) & 0x7fffffff;
    }
    return hash;
  }

  /// Prochain créneau HH:MM local (aujourd'hui si pas encore passé,
  /// sinon demain) — le fuseau de l'utilisateur, pas du serveur.
  tz.TZDateTime _nextOccurrence(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    if (!scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }
}