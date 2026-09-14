import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';

/// Connexion (convention masa-labs) : numéro de téléphone + mot de
/// passe, direct, pas d'OTP. Le téléphone devient un pseudo-email.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).signIn(
            phone: _phoneController.text,
            password: _passwordController.text,
          );
      if (mounted) {
        final onboarded =
            ref.read(grootProfileProvider)?.onboardingCompleted ?? false;
        context.go(onboarded ? '/aujourdhui' : '/onboarding');
      }
    } catch (e) {
      // Le message décrit le fait, sans s'excuser (design system §8).
      setState(() => _error =
          'T\u00e9l\u00e9phone ou mot de passe incorrect. R\u00e9essaie quand tu veux.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/bienvenue')),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                Text('Content de te revoir', style: theme.textTheme.headlineLarge),
                const SizedBox(height: 6),
                Text(
                  'Groot t\u2019attendait.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Num\u00e9ro de t\u00e9l\u00e9phone',
                    hintText: '0700000000',
                    prefixIcon: Icon(Icons.phone),
                  ),
                  validator: (v) =>
                      (v == null || v.length < 8) ? 'Num\u00e9ro trop court' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Mot de passe',
                    prefixIcon: Icon(Icons.lock),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Entre ton mot de passe' : null,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                ],
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Se connecter'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.go('/inscription'),
                  child: const Text(
                      'Pas encore de compte ? Rejoins la for\u00eat'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}