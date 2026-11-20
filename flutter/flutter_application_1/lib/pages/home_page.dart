import 'package:flutter_application_1/pages/login_page.dart';
import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import '../services/auth_service.dart';
import '../services/program_service.dart';


class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.userId});

  final String userId;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _formKey = GlobalKey<FormState>();
  final authService = AuthService();
  final programService = ProgramService();

  String? userText;

  String? firstName;
  String? lastName;
  String? login;
  String? email;
  String? role;

  List<dynamic> declaredPrograms = [];
  List<dynamic> otherPrograms = [];

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

        firstName = userData['firstName'] as String? ?? '';
        lastName = userData['lastName'] as String? ?? '';
        final name = '$firstName $lastName'.trim();
        email = userData['email'] ?? 'Not available';
        login = userData['login'];
        role = userData['role'];

        declaredPrograms = userData['declarations'];
        setState(() {
          userText =
              'Name: ${name} \nLogin: ${userData['login']} \nEmail: ${email ?? 'Not available'} \nRole: ${userData['role']}';
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadPrograms([bool all = true]) async {
    try {
      final response = await programService.getPrograms();

      if (response.statusCode >= 200 || response.statusCode < 300) {
        otherPrograms = [];

        final programData = jsonDecode(response.body);
        
        final allPrograms = programData is List ? programData : programData['items'] as List;        
        
        // remove classes if needed
        if (!all) {
          // get all declared ids
          final List<String> declaredIds = [];
          for (int i = 0; i < declaredPrograms.length; i++) {
            declaredIds.add(declaredPrograms[i]['programId']);
          }
          
          // remove from allPrograms
          for (int i = 0; i < allPrograms.length; i++) {
            final tmpId = allPrograms[i]['_id'];
            if (!declaredIds.contains(tmpId)) {
              otherPrograms.add(allPrograms[i]);
            }
          }
        } else {
          otherPrograms = allPrograms;
        }
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
        backgroundColor: theme.colorScheme.primaryContainer,
        surfaceTintColor: Colors.transparent,
        shape: Border(
          bottom: BorderSide(
          color: theme.colorScheme.primary,
          width:  2,
          )
        ),
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
      body: SingleChildScrollView(
        child: Align(
          alignment: Alignment.topCenter,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    border: Border(
                      top: BorderSide(
                        color: theme.colorScheme.primary,
                        width: 2
                      )
                    ),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        )
                      ],
                      const SizedBox(height: 8,),
                      Align(
                        alignment: Alignment.bottomRight,
                        child: ElevatedButton(
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
                                
                                if (response.statusCode >= 200 && response.statusCode < 300) {
                                  final fn = firstNameController.text;
                                  final ln = lastNameController.text;
                                  final name = '$fn $ln'.trim();
                                  final em = emailController.text.isEmpty ? 'Not provided' : emailController.text;
                                    
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
                            shape: const CircleBorder(),
                            fixedSize: const Size(50, 50),
                            padding: EdgeInsets.zero,
                          ),
                          child: Icon(isEditing ? Icons.check : Icons.edit, size: 30,),
                        ),
                      ),
                      //ElevatedButton(onPressed: () => loadUser(widget.userId), child: const Text("test")),
                    ]
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(24),
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    border: Border(
                      top: BorderSide(
                        color: theme.colorScheme.primary,
                        width: 2
                      )
                    ),
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
                        "Declared Programs",
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: declaredPrograms.length,
                        itemBuilder: (context, index) {
                          final declaration = declaredPrograms[index];
                          final programId = declaration['programId'] as String;

                          return FutureBuilder(
                            future: programService.getProgram(programId),
                            builder: (context, snapshot) {
                              if (snapshot.connectionState == ConnectionState.waiting) {
                                return const CircularProgressIndicator();
                              }

                              if (snapshot.hasError) {
                                return Text('Could not load program: ${snapshot.error}');
                              }

                              final response = snapshot.data!;
                              if (response.statusCode < 200 || response.statusCode >= 300) {
                                return Text('Request failed: ${response.statusCode}');
                              }

                              final program = jsonDecode(response.body) as Map<String, dynamic>;

                              // deal with handling date
                              final date = DateTime.parse(program['createdAt']);
                              final month = DateFormat('MMM d, yyyy').format(date);

                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: theme.colorScheme.primary,
                                    width: 2
                                  )
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded( child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(program['name']?.toString() ?? 'Unnamed program',
                                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                                      textAlign: TextAlign.left,
                                      ),
                                      Text('Catalog ${program['catalogYear']?.toString()} since ${month}' ?? 'Unnamed program',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                      textAlign: TextAlign.left,
                                      ),
                                    ],
                                    )),
                                    ElevatedButton(
                                      onPressed: () async {
                                        final confirmed = await showDialog<bool>(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            backgroundColor: theme.colorScheme.primaryContainer,
                                            title: Text('Delete program?', style: TextStyle(color: theme.colorScheme.secondary)),
                                            content: Text('Are you sure you want to delete this program?', style: TextStyle(color: theme.colorScheme.secondary)),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.of(context).pop(false),
                                                child: const Text('Cancel'),
                                              ),
                                              TextButton(
                                                onPressed: () => Navigator.of(context).pop(true),
                                                child: const Text('Delete'),
                                              ),
                                            ],
                                          )
                                        );
                                        if (confirmed == true) {
                                          debugPrint(programId);
                                          debugPrint(index.toString());
                                          // remove program from list
                                          setState(() {
                                            declaredPrograms.removeAt(index);
                                          });

                                          // api function
                                          try {
                                            final response = await authService.updateUser(
                                              widget.userId,
                                              declaredPrograms: declaredPrograms 
                                            );
                                            if (!context.mounted) return;

                                          } catch (e) {
                                            if (!context.mounted) return;
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Could not connect to the server')),
                                              );
                                              debugPrint(e.toString());
                                          }
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: theme.colorScheme.primary,
                                        foregroundColor: theme.colorScheme.secondary,
                                        shape: const CircleBorder(),
                                        padding: EdgeInsets.zero,
                                        fixedSize: const Size(40, 40),
                                      ),
                                      child: const Icon(Icons.delete),
                                    ),
                                  ],
                                ), 
                              );
                            },
                          );
                        },
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ElevatedButton(onPressed:() async {
                            await loadPrograms(false);
                            
                            if (!mounted) return;

                            if (otherPrograms.length == 0) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('There are no other programs to declare')),
                                );
                            } else {
                              final selectedProgram = await showDialog<Map<String, dynamic>>(
                                context: context,
                                builder: (dialogContext) {
                                  return StatefulBuilder(
                                    builder: (context, setDialogState) {
                                      return AlertDialog(
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(16),
                                          side: BorderSide(
                                            color: theme.colorScheme.primary,
                                            width: 2,
                                          ),
                                        ),
                                        title: Text('Choose a program', style: TextStyle(color: theme.colorScheme.secondary)),
                                        backgroundColor: theme.colorScheme.primaryContainer,
                                        content: SizedBox(
                                          width: double.maxFinite,
                                          height: 500,
                                          child: ListView.builder(
                                            itemCount: otherPrograms.length,
                                            itemBuilder: (context, index) {
                                              final program = otherPrograms[index];
                                              
                                              return ListTile(
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(16),
                                                  side: BorderSide(
                                                    color: theme.colorScheme.primary,
                                                    width: 2,
                                                  ),
                                                ),
                                                title: Text(
                                                  program['name']?.toString() ?? 'Unnamed program',
                                                  style: TextStyle(color: theme.colorScheme.secondary)
                                                ),
                                                subtitle: Text(
                                                  '(${program['type']?.toString()}) - Catalog ${program['catalogYear']?.toString()}' ?? 'Unnamed program',
                                                  style: TextStyle(color: theme.colorScheme.secondary)
                                                ),
                                                trailing: ElevatedButton(
                                                  onPressed: () async {
                                                    try {
                                                      debugPrint(declaredPrograms.toString());
                                                      setState(() {
                                                        declaredPrograms.add({
                                                          'programId': program['_id'].toString(),
                                                          'catalogYear': program['catalogYear'],
                                                          'declaredAt': DateTime.now().toUtc().toIso8601String(),
                                                        });
                                                      });
                                                      setDialogState(() {
                                                        otherPrograms.remove(program);
                                                      });
                                                      final response = await authService.updateUser(
                                                      widget.userId,
                                                      declaredPrograms: declaredPrograms 
                                                      );
                                                    } catch (e) {
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
                                                    shape: const CircleBorder(),
                                                    padding: EdgeInsets.zero,
                                                    fixedSize: const Size(40, 40),
                                                  ),
                                                  child: const Icon(Icons.check),
                                                ),
                                                onTap: () => Navigator.pop(dialogContext, program),
                                              );
                                            },
                                          ),
                                        ),
                                      );
                                    }
                                  );
                                }
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: theme.colorScheme.secondary,
                            padding: EdgeInsets.zero,
                            fixedSize: const Size(40, 40),
                          ),
                          child: Text("Declare a program", style: TextStyle(color: theme.colorScheme.secondary))
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(24),
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    border: Border(
                      top: BorderSide(
                        color: theme.colorScheme.primary,
                        width: 2
                      )
                    ),
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
                        "Registration Dates",
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      Text(
                        "Registration Dates",
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      Text(
                        "Registration Dates",
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                    ],
                  ),
                ),
              )
            ],
          )
        )
      )
    );
  }
}