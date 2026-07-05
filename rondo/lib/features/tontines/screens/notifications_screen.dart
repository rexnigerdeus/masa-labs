import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<Map<String, dynamic>>? _notifications;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      final notifs = await service.getNotifications();
      if (mounted) setState(() => _notifications = notifs);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString()}'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(String notifId) async {
    try {
      final service = ref.read(tontineServiceProvider);
      await service.marquerNotifLue(notifId);
      await _loadNotifications();
    } catch (_) {}
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'rappel_cotisation':
        return Icons.alarm_outlined;
      case 'paiement_confirme':
        return Icons.check_circle_outline;
      case 'nouveau_membre':
        return Icons.person_add_outlined;
      case 'tour_atteint':
        return Icons.emoji_events_outlined;
      case 'message_admin':
        return Icons.message_outlined;
      case 'retard_paiement':
        return Icons.warning_amber_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'paiement_confirme':
        return AppTheme.success;
      case 'retard_paiement':
        return AppTheme.error;
      case 'rappel_cotisation':
        return AppTheme.warning;
      default:
        return AppTheme.rondo;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Notifications'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : _notifications == null || _notifications!.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.notifications_none, size: 48, color: AppTheme.muted2),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune notification',
                        style: GoogleFonts.inter(color: AppTheme.muted),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: AppTheme.rondo,
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    itemCount: _notifications!.length,
                    itemBuilder: (context, index) {
                      final n = _notifications![index];
                      final type = n['type'] as String? ?? '';
                      final titre = n['titre'] as String? ?? '';
                      final corps = n['corps'] as String? ?? '';
                      final lu = n['lu'] as bool? ?? false;
                      final notifId = n['id'] as String;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                        child: GestureDetector(
                          onTap: lu ? null : () => _markAsRead(notifId),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: lu ? AppTheme.card : AppTheme.rondoSoft,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: lu
                                    ? AppTheme.text.withValues(alpha: 0.08)
                                    : AppTheme.rondo.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: _colorForType(type).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _iconForType(type),
                                    color: _colorForType(type),
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              titre,
                                              style: GoogleFonts.inter(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                                color: AppTheme.text,
                                              ),
                                            ),
                                          ),
                                          if (!lu)
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                color: AppTheme.rondo,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        corps,
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          color: AppTheme.muted,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ).animate().fadeIn(
                        delay: Duration(milliseconds: 80 * index),
                        duration: 400.ms,
                      ).slideY(begin: 0.05);
                    },
                  ),
                ),
    );
  }
}