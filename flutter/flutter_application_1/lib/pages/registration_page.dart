import 'package:material_ui/material_ui.dart';
import 'dart:convert';

import '../services/auth_service.dart';
import 'login_page.dart';

class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key, required this.title});

  final String title;

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  final loginController = TextEditingController();
  final passwordController = TextEditingController();
  final firstnameController = TextEditingController();
  final lastnameController = TextEditingController();
  final emailController = TextEditingController();
  final authService = AuthService();


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
                    'Register',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create an account',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  Row(children: [
                    Expanded(
                      child: TextFormField(
                        controller: firstnameController,
                        style: TextStyle(
                        color: theme.colorScheme.secondary,
                      ),
                        decoration: const InputDecoration(
                          labelText: 'First name',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.name,
                        validator: (value) =>
                            value == null || value.isEmpty ? 'Enter first name' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: lastnameController,
                        style: TextStyle(
                        color: theme.colorScheme.secondary,
                      ),
                        decoration: const InputDecoration(
                          labelText: 'Last name',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value == null || value.isEmpty ? 'Enter last name' : null,
                      ),
                    ),
                  ],),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: loginController,
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                    ),
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
                    controller: emailController,
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                    ),
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email (optional)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: passwordController,
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                    ),
                    obscureText: true,
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
                          const SnackBar(content: Text('Please enter in your information')),
                        );
                        return;
                      };
                      try {
                        final response = await authService.register(
                          firstName: firstnameController.text.trim(),
                          lastName: lastnameController.text.trim(),
                          login: loginController.text.trim(),
                          password: passwordController.text,
                          email: emailController.text.trim(),
                        );

                        if (!context.mounted) return;

                        debugPrint(response.body.toString());

                        switch (response.statusCode) {
                          case 201:
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('User successfully created')));
                            break;
                          case 409:
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('User already exists')));
                            break;
                          default:
                            final data = jsonDecode(response.body) as Map<String, dynamic>;
                            final message = data?['details'];
                            final type = [message?['password'], message?['login']].where((error) => error != null).map((error) => error.toString());
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(type.join('\n'))));
                            break;
                        }
                        if (response.statusCode == 201) {
                          Navigator.push(context, 
                          MaterialPageRoute(builder: (context) => const LoginPage(title: "Login")));
                        }
                      } catch(e) {
                        if (!context.mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Could not connect to the server')),
                        );
                        debugPrint(e.toString());
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.secondary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Register'),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        "Already have an account?",
                        style: TextStyle(
                          color: theme.colorScheme.secondary,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.push(context, 
                          MaterialPageRoute(builder: (context) => const LoginPage(title: "Login")));
                        },
                        child: const Text('Login'),
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