import 'package:material_ui/material_ui.dart';
import 'dart:convert';

import '../services/auth_service.dart';
import 'registration_page.dart';
import 'home_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.title});

  final String title;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final loginController = TextEditingController();
  final passwordController = TextEditingController();
  final authService = AuthService();

  @override
  void dispose() {
    loginController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            width: 360,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Login',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in to your account',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                    ),
                    controller: loginController,
                    decoration: const InputDecoration(
                      labelText: 'Login',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.login),
                    ),
                    keyboardType: TextInputType.text,
                    validator: (value) =>
                        value == null || value.isEmpty ? 'Enter your login' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                    ),
                    obscureText: true,
                    controller: passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    validator: (value) => value == null || value.isEmpty
                        ? 'Enter your password'
                        : null,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () async {
                      if (!_formKey.currentState!.validate()) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter your login and password')),
                        );
                        return;
                      };
                      try {
                        final response = await authService.login(
                          login: loginController.text.trim(),
                          password: passwordController.text,
                        );

                        if (!context.mounted) return;

                        final data = jsonDecode(response.body) as Map<String, dynamic>;
                        final message = data['error'] ?? 'Login failed';

                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(response.statusCode == 200 ? 'Login Success' : message.toString())),
                        );
                        if (response.statusCode == 200) {
                          final id = await authService.getId();
                          Navigator.push(context, 
                          MaterialPageRoute(builder: (context) => HomePage(userId: id.toString())));
                        }
                      } catch(e) {
                        if (!context.mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Could not connect to the server')),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.secondary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Log in'),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        "Don't have an account?",
                        style: TextStyle(
                          color: theme.colorScheme.secondary,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.push(context, 
                          MaterialPageRoute(builder: (context) => RegistrationPage(title: "Register")));
                        },
                        child: const Text('Register'),
                      ),
                    ],
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}