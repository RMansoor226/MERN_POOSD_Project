import 'package:flutter_application_1/pages/admin_page_display.dart';
import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';
import 'package:flutter_application_1/pages/program_display_page.dart';

import '../services/auth_service.dart';
import '../services/admin_service.dart';


class AdminPage extends StatefulWidget {
  const AdminPage({super.key, required this.userId, required this.role});

  final String userId;
  final String role;

  @override
  State<AdminPage> createState() => _AdminPageState();
}

class _AdminPageState extends State<AdminPage> {
  final _formKey = GlobalKey<FormState>();
  final authService = AuthService();
  final adminService = AdminService();

  String? userText;

  // user information
  String? firstName;
  String? lastName;
  String? login;
  String? email;
  String? role;

  // admin info
  List<dynamic> departments = [];
  List<dynamic> terms = [];
  List<dynamic> instructors = [];
  List<dynamic> courses = [];
  List<dynamic> sections = [];
  List<dynamic> programs = [];
  List<dynamic> users = [];

  @override
  void initState() {
    super.initState();
    loadUser(widget.userId);
    loadDepartments();
    loadTerms();
    loadInstructors();
    loadCourses();
    loadSections();
    loadPrograms();
    loadUsers();
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
        email = userData['email'] ?? 'Not provided';
        login = userData['login'];
        role = userData['role'];

        setState(() {
          userText =
              'Name: ${name} \nLogin: ${userData['login']} \nEmail: ${email ?? 'Not provided'} \nRole: ${userData['role']}';
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadDepartments() async {
    try {
      final response = await adminService.getDepartments();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          departments = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadTerms() async {
    try {
      final response = await adminService.getTerms();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          terms = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }  

  Future<void> loadInstructors() async {
    try {
      final response = await adminService.getInstructors();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          instructors = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadCourses() async {
    try {
      final response = await adminService.getCourses();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          courses = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadSections() async {
    try {
      final response = await adminService.getSections();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          sections = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadPrograms() async {
    try {
      final response = await adminService.getPrograms();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        if (!mounted) return;

        setState(() {
          programs = data['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<void> loadUsers() async {
    try {
      final response = await adminService.getUsers();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (!mounted) return;
        
        setState(() {
          users = data as List<dynamic>;
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
        backgroundColor: theme.colorScheme.primaryContainer,
        surfaceTintColor: Colors.transparent,
        shape: Border(
          bottom: BorderSide(
          color: theme.colorScheme.primary,
          width:  2,
          )
        ),
        title: Text('Admin', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Admin', style: TextStyle(color: Colors.white)),
              ),
              onTap: () {
                Navigator.pop(context);
              }
            ),
            ListTile(
              title: Text('Course Catalog', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => CourseCatalogPage(userId: widget.userId, role: widget.role)));
              }
            ),
            ListTile(
              title: Text('Class Search', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId, role: widget.role)));
              }
            ),
            ListTile(
              title: Text('Programs', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ProgramsPage(userId: widget.userId, role: widget.role)));
              }
            ),
            ListTile(
              title: const Text('Logout', style: TextStyle(color: Colors.white)),
              onTap: () async {
                Navigator.pop(context);
                await authService.logout();
                
                if (!context.mounted) return;

                Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
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
                        width: 4
                      ),
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
                                else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('${response.body}')),
                                  );
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
                              emailController.text = email == 'Not provided' ? email as String : '';
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      debugPrint('department: $departments');
                      Navigator.push(context, MaterialPageRoute(builder: (context) => AdminPageDisplay(userId: widget.userId, pageType: 'departments', title: 'Department Management', information: departments, role: widget.role,)));
                    },
                    child: Container(
                      padding: const EdgeInsets.only(left: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
                            ),
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
                              "Departments",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${departments.length}',
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      debugPrint('terms: $terms');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(right: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Terms",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${terms.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      debugPrint('instructors: $instructors');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(left: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Instructors",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${instructors.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      debugPrint('courses: $courses');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(right: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Courses",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${courses.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      debugPrint('Sections $sections');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(left: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Sections",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${sections.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      debugPrint('programs: $programs');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(right: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Programs",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${programs.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      debugPrint('users: $users');
                    },
                    child: Container(
                      padding: const EdgeInsets.only(left: 24, bottom: 8),
                      child: Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          border: Border(
                            top: BorderSide(
                              color: theme.colorScheme.primary,
                              width: 4
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
                              "Users",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "${users.length}",
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              children: [
                                Text(
                                  'Manage',
                                  textAlign: TextAlign.left,
                                  style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary),
                                ),
                                Icon(Icons.arrow_right, color: theme.colorScheme.tertiary,),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          )
        )
      )
    );
  }
}