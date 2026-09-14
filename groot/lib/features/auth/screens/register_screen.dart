import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';

/// Inscription (convention masa-labs) : numéro de téléphone + mot de
/// passe + prénom. Le pseudo-email `@everyday.co` est généré, zéro SMS.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
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
      await ref.read(authServiceProvider).signUp(
            phone: _phoneController.text,
            password: _passwordController.text,
            fullName: _nameController.text,
          );
      if (mounted) context.go('/onboarding');
    } catch (e) {
      setState(() => _error = e.toString().contains('already')
          ? 'Ce num\u00e9ro a d\u00e9j\u00e0 un compte. Connecte-toi directement.'
          : 'Inscription impossible pour le moment. R\u00e9essaie dans un instant.');
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
                Text('Ta premi\u00e8re graine',
                    style: theme.textTheme.headlineLarge),
                const SizedBox(height: 6),
                Text(
                  'Inscription gratuite — habitudes illimit\u00e9es d\u00e8s le d\u00e9part.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Pr\u00e9nom',
                    prefixIcon: Icon(Icons.person),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Ton pr\u00e9nom' : null,
                ),
                const SizedBox(height: 16),
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
                    labelText: 'Mot de passe (6 caract\u00e8res min.)',
                    prefixIcon: Icon(Icons.lock),
                  ),
                  validator: (v) => (v == null || v.length < 6)
                      ? '6 caract\u00e8res minimum'
                      : null,
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
                      : const Text('Cr\u00e9er mon compte'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.go('/connexion'),
                  child: const Text('D\u00e9j\u00e0 un compte ? Connecte-toi'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}