import 'package:flutter_application_1/pages/login_page.dart';
import 'package:material_ui/material_ui.dart';
import 'dart:convert';

import '../services/auth_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.userId});

  final String userId;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _formKey = GlobalKey<FormState>();
  final authService = AuthService();
  String? userText;
  String? firstName;
  String? lastName;
  String? login;
  String? email;
  String? role;

  @override
  void initState() {
    super.initState();
    loadUser(widget.userId);
  }

  @override
  void dispose() {
    firstNameController.dispose();
    lastNameController.dispose();
    emailController.dispose();
    super.dispose();
  }

  Future<void> loadUser(String id) async {
    try {
      final response = await authService.getUserById(id);

      if (response.statusCode == 200) {
        final userData = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;
        debugPrint(userData.toString());

        firstName = userData['firstName'] as String? ?? '';
        lastName = userData['lastName'] as String? ?? '';
        final name = '$firstName $lastName'.trim();
        email = userData['email'] ?? '';
        login = userData['login'];
        role = userData['role'];

        setState(() {
          userText =
              'Name: ${name} \nLogin: ${userData['login']} \nEmail ${email ?? 'Not available'} \nRole: ${userData['role']}';
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final emailController = TextEditingController();
  bool isEditing = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text('Home', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
        leading: Builder(
          builder: (context) => Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            shape: BoxShape.circle,
            ),
            child: IconButton(onPressed: () => Scaffold.of(context).openDrawer(),
            icon: Icon(Icons.menu, color: theme.colorScheme.secondary))
          )
        )
      ),
      drawer: Drawer(
        backgroundColor: theme.colorScheme.primaryContainer,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              height: 100,
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.all(16),
              child: Text('Navigation', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
            ),
            ListTile(
              title: const Text('Home', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
              }
            ),
            ListTile(
              title: const Text('Logout', style: TextStyle(color: Colors.white)),
              onTap: () async {
                Navigator.pop(context);
                await authService.logout();
                Navigator.push(context, 
                MaterialPageRoute(builder: (context) => LoginPage(title: 'login')));
              },
            )
          ]
        )
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Align(
        alignment: Alignment.topCenter,
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                    'My Profile',
                    textAlign: TextAlign.left,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                ),
                const SizedBox(height: 8,),
                if (isEditing) ...[
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                        controller: firstNameController,
                        decoration: const InputDecoration(labelText: 'First Name'),
                        style: TextStyle(color: theme.colorScheme.secondary),
                        keyboardType: TextInputType.text,
                        validator: (value) =>
                            value == null || value.isEmpty ? 'Enter your first name' : null,
                      ),
                      TextFormField(
                        controller: lastNameController,
                        decoration: const InputDecoration(labelText: 'Last Name'),
                        style: TextStyle(color: theme.colorScheme.secondary),
                        keyboardType: TextInputType.text,
                        validator: (value) =>
                            value == null || value.isEmpty ? 'Enter your last name' : null,
                      ),
                      TextFormField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Email'),
                        style: TextStyle(color: theme.colorScheme.secondary),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      ],
                    ),
                  )
                ] else ...[
                  Text(userText ?? 'Loading user...',
                  style: const TextStyle(color: Colors.white, fontSize: 16),
                  )
                ],
                const SizedBox(height: 8,),
                ElevatedButton(
                  onPressed: () {
                    loadUser(widget.userId);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.secondary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('test auth')
                ),
                const SizedBox(height: 8,),
                ElevatedButton(
                  onPressed: () async {
                    if (isEditing) {
                      if (!_formKey.currentState!.validate()) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('test')),
                        );
                        return;
                      }
                      try {
                        final response = await authService.updateUser(
                          widget.userId,
                          firstName: firstNameController.text,
                          lastName: lastNameController.text,
                          email: emailController.text,
                        );

                        if (!context.mounted) return;
                        debugPrint(response.body.toString());
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                          final fn = firstNameController.text;
                          final ln = lastNameController.text;
                          final name = '$fn $ln'.trim();
                          final em = emailController.text.isEmpty ? 'Not available' : emailController.text;
                            
                          setState(() {
                            userText =
                                'Name: ${name} \nLogin: ${login} \nEmail: ${em} \nRole: ${role}';
                                isEditing = false;
                            firstName = fn;
                            lastName = ln;
                            email = emailController.text.isEmpty ? '' : emailController.text;
                          });
                        }
                      } catch(e) {
                        if (!context.mounted) return;

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Could not connect to the server')),
                        );
                        debugPrint(e.toString());
                      }
                    } else {
                      firstNameController.text = firstName as String;
                      lastNameController.text = lastName as String;
                      emailController.text = email as String;
                      setState(() {
                            isEditing = true;
                      });
                    }
                    
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.secondary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: Icon(isEditing ? Icons.check : Icons.edit),
                ),
              ]
            )
          )
        )
      )
    );
  }
}