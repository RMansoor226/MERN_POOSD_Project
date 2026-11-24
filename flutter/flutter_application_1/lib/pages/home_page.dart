import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';
import 'package:flutter_application_1/pages/program_display_page.dart';

import '../services/auth_service.dart';
import '../services/program_service.dart';
import '../services/term_service.dart';
import '../services/enrollment_service.dart';


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
  final termService = TermService();
  final enrollmentService = EnrollmentService();

  String? userText;

  // user information
  String? firstName;
  String? lastName;
  String? login;
  String? email;
  String? role;

  // program information
  List<dynamic> declaredPrograms = [];
  List<dynamic> otherPrograms = [];
  // term information
  List<dynamic> terms = [];
  dynamic latestTerm;

  // enrollment information
  List<dynamic> enrollments = [];
  List<dynamic> waitlists = [];
  List<dynamic> enrolled = [];
  List<dynamic> completed = [];

  @override
  void initState() {
    super.initState();
    loadTerms();
    getLatestTerm();
    loadAllEnrollments();
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
        email = userData['email'] ?? 'Not provided';
        login = userData['login'];
        role = userData['role'];

        declaredPrograms = userData['declarations'];
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

  Future<void> loadPrograms([bool all = true]) async {
    try {
      final response = await programService.getAllPrograms();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        otherPrograms = [];

        final programData = jsonDecode(response.body);
        
        final allPrograms = programData['items'] as List;        
        
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

  Future<void> loadTerms() async {
    try {
      final response = await termService.getTerms();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final termData = jsonDecode(response.body);
        
        terms = termData['items'] as List;

        getLatestTerm();
      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<dynamic> getLatestTerm() async {
    final today = DateTime.now();

    for (int i = 0; i < terms.length; i++) {
      final term = terms[i];

      final start = DateTime.parse(term['registrationOpens']);
      final end = DateTime.parse(term['registrationCloses']);

      // get the date that is in range
      final inRange = !today.isBefore(start) && !today.isAfter(end); // make sure it counts midnight

      if (inRange) latestTerm = term;
    }
    if (!terms.contains(latestTerm)) {
      debugPrint("No terms right now");
    }
  }

  Future<void> loadAllEnrollments() async {
    try {
      final response = await enrollmentService.getAllEnrollments();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final enrollmentsData = jsonDecode(response.body);
        waitlists = [];
        enrolled = [];
        completed = [];

        enrollments = enrollmentsData['items'] as List;

        // get waitlists
        for (int i = 0; i < enrollments.length; i++) {
          final tmp = enrollments[i];
          
          if (tmp['status'] == 'waitlisted') {
            setState(() {
              waitlists.add(tmp);
            });
          }
          else if (tmp['status'] == 'enrolled') {
            setState(() {
              enrolled.add(tmp);
            });
          }
          else if (tmp['status'] == 'completed') {
            setState(() {
              completed.add(tmp);
            });
          }
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
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Home', style: TextStyle(color: Colors.white)),
              ),
              onTap: () {
                Navigator.pop(context);
              }
            ),
            ListTile(
              title: Text('Course Catalog', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => CourseCatalogPage(userId: widget.userId)));
              }
            ),
            ListTile(
              title: Text('Class Search', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId)));
              }
            ),
            ListTile(
              title: Text('Programs', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ProgramsPage(userId: widget.userId)));
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
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: 
                              FutureBuilder(
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
                                    color: theme.colorScheme.secondaryContainer,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border(
                                      left: BorderSide(
                                        color: theme.colorScheme.primary,
                                        width: 4
                                      ),
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
                                        Text('Catalog ${program['catalogYear']?.toString()} since ${month}',
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
                                              
                                              if (response.statusCode >= 300 || response.statusCode < 200) {
                                                debugPrint('Response failed: ${response.statusCode}');
                                              }

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
                            ),
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
                                            width: 4,
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
                                                    width: 4,
                                                  ),
                                                ),
                                                title: Text(
                                                  program['name']?.toString() ?? 'Unnamed program',
                                                  style: TextStyle(color: theme.colorScheme.secondary)
                                                ),
                                                subtitle: Text(
                                                  '(${program['type']?.toString()}) - Catalog ${program['catalogYear']?.toString()}',
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
                                                      if (response.statusCode >= 300 || response.statusCode < 200) {
                                                        debugPrint("error ${response.statusCode}");
                                                      }
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
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(builder:(context) => ProgramsPage(userId: widget.userId)));
                            },
                            child: Text(
                              'Browse all programs',
                              style: TextStyle(color: theme.colorScheme.secondary,
                              decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2),
                              ),
                            ),
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
                        "Registration Dates",
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 120,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondaryContainer,
                          borderRadius: BorderRadius.circular(16),
                          border: Border(
                            left: BorderSide(
                              color: theme.colorScheme.tertiaryContainer,
                              width: 4
                            ),
                          )
                        ),
                        child: ListTile(
                          title: Text(
                            '${latestTerm?['name'] ?? 'Loading...'}',
                            textAlign: TextAlign.left,
                            style: TextStyle(fontSize: 20, color: theme.colorScheme.secondary, fontWeight: FontWeight.bold)
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${DateFormat('MMM d, yyyy').format(DateTime.parse(latestTerm?['registrationOpens'] ?? DateTime.now().toIso8601String()))} -'
                                ' ${DateFormat('MMM d, yyyy').format(DateTime.parse(latestTerm?['registrationCloses'] ?? DateTime.now().toIso8601String()))}',
                                style: TextStyle(fontSize: 16, color: theme.colorScheme.tertiary)
                              ),
                              Text(
                                'Closes in ${DateTime.parse(latestTerm?['registrationCloses'] ?? DateTime.now().toIso8601String()).difference(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day)).inDays} Days',
                                // '${latestTerm?['registrationCloses'] == null ? 'null' : DateTime.parse(latestTerm['registrationCloses'].toString())}',
                                style: TextStyle(fontSize: 16, color: theme.colorScheme.secondary, fontWeight: FontWeight.bold)
                              ),
                               TextButton(
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId)));
                                },
                                style: TextButton.styleFrom(
                                  alignment: Alignment.centerLeft,
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Browse ${latestTerm?['name'] ?? 'Unknown'} classes',
                                      style: TextStyle(fontSize: 16, color: theme.colorScheme.secondary, fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1),
                                      decorationThickness: 2
                                      )
                                    ),
                                    Icon(Icons.arrow_forward, size: 16, color: theme.colorScheme.secondary),
                                  ],
                                ),
                              ),
                                                      ],
                          )
                        )
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(24),
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.all(24),
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
                        'Waitlists',
                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height:  8,),
                      if (waitlists.isEmpty)
                      Text('You are not on any waitlists.', style: TextStyle(color: theme.colorScheme.secondary)),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: waitlists.length,
                        itemBuilder: (context, index) {
                          final enrolls = waitlists[index];
                          final sectionNum = enrolls['sectionId']['sectionNumber'];
                          final courseCode = enrolls['courseId']['code'];
                          final termName = enrolls['termId']['name'];

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.secondaryContainer,
                              borderRadius: BorderRadius.circular(16),
                              border: Border(
                                left: BorderSide(
                                  color: theme.colorScheme.primary,
                                  width: 4
                                ),
                              )
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded( child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${courseCode}',
                                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                                  textAlign: TextAlign.left,
                                  ),
                                  Text('#${enrolls?['waitlistPosition']} in waitlist' ,
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                                  textAlign: TextAlign.left,
                                  ),
                                  Text('Section ${sectionNum?.toString() ?? 'Unnamed program'} - ${termName?.toString() ?? 'Unnamed program'}' ,
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
                                        title: Text('Exit waitlist?', style: TextStyle(color: theme.colorScheme.secondary)),
                                        content: Text('Are you sure you want to exit waitlist?', style: TextStyle(color: theme.colorScheme.secondary)),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.of(context).pop(false),
                                            child: const Text('Cancel'),
                                          ),
                                          TextButton(
                                            onPressed: () => Navigator.of(context).pop(true),
                                            child: const Text('Remove'),
                                          ),
                                        ],
                                      )
                                    );
                                    if (confirmed == true) {
                                      // api function
                                      try {
                                        final response = await enrollmentService.dropEnrollment(
                                          enrolls['_id'].toString()
                                        );
                                        if (!context.mounted) return;

                                        // remove program from list
                                        setState(() {
                                          waitlists.removeAt(index);
                                        });

                                        debugPrint(response.body);

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
                      ),
                    ],
                  )
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'My Schedule',
                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8,),
                      if (enrolled.isEmpty)
                      TextButton(
                        onPressed: () {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId)));
                        },
                        child: Text('You are not enrolled for any classes. Find classes',
                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold,
                         decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2),
                        ),
                      ),
                      if (enrolled.isNotEmpty)
                      Text('${latestTerm?['name'] ?? 'loading term'}',
                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8,),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: enrolled.length,
                        itemBuilder: (context, index) {
                          final enrolls = enrolled[index];
                          final sectionNum = enrolls['sectionId']['sectionNumber'];
                          final courseCode = enrolls['courseId']['code'];
                          final termName = enrolls['termId']['name'];
                          final courseName = enrolls['courseId']['title'];

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.secondaryContainer,
                              borderRadius: BorderRadius.circular(16),
                              border: Border(
                                left: BorderSide(
                                  color: theme.colorScheme.primary,
                                  width: 4
                                ),
                              )
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded( child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: theme.colorScheme.primary,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          courseCode?.toString() ?? 'Unnamed program',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                                          textAlign: TextAlign.left,
                                        ),
                                      ),
                                      const SizedBox(width: 8,),
                                      Expanded(
                                        child: Text(
                                          courseName?.toString() ?? 'Unnamed program',
                                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                                          textAlign: TextAlign.left,
                                          softWrap: true,
                                        ),
                                      )
                                    ],
                                  ),
                                  Text('Section ${sectionNum?.toString() ?? 'Unnamed program'} - ${termName?.toString() ?? 'Unnamed program'}' ,
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
                                        title: Text('Drop class?', style: TextStyle(color: theme.colorScheme.secondary)),
                                        content: Text('Are you sure you want to drop this class?', style: TextStyle(color: theme.colorScheme.secondary)),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.of(context).pop(false),
                                            child: const Text('Cancel'),
                                          ),
                                          TextButton(
                                            onPressed: () => Navigator.of(context).pop(true),
                                            child: const Text('Drop'),
                                          ),
                                        ],
                                      )
                                    );
                                    if (confirmed == true) {
                                      // api function
                                      try {
                                        final response = await enrollmentService.dropEnrollment(
                                          enrolls['_id'].toString()
                                        );
                                        if (!context.mounted) return;

                                        // remove program from list
                                        setState(() {
                                          enrolled.removeAt(index);
                                        });

                                        debugPrint(response.body);

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
                                  child: Text('Drop', style: TextStyle(color: theme.colorScheme.secondary),),
                                ),
                              ],
                            ), 
                          );
                        },
                      ),
                    ],
                  )
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Degree Progress',
                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8,),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: declaredPrograms.length,
                        itemBuilder: (context, index) {
                          final programId = declaredPrograms[index]['programId'];
                          int totalCreditHours = 0;

                          // calc tch
                          for (int i = 0; i < completed.length; i++) {
                            totalCreditHours += (completed[i]['courseId']['credits'] as num).toInt();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: FutureBuilder(
                              future: programService.getProgram(programId),
                              builder: (context, snapshot) {
                                if (snapshot.connectionState == ConnectionState.waiting) {
                                  return const CircularProgressIndicator();
                                }

                                if (snapshot.hasError || !snapshot.hasData) {
                                  return const Text('Could not load program');
                                }

                                final program = jsonDecode(snapshot.data!.body);

                                final requirements = program['requirements'];
                                
                                // get num of requirements completed
                                int reqCompleted = 0;
                                
                                for (int i = 0; i < requirements.length; i++) {
                                  final courses = requirements[i]['courseIds'];
                                  
                                  int count = 0;
                                  for (int j = 0; j < courses.length; j++) {
                                    final courseId = courses[j];
                                    final courseIdx = completed.indexWhere(
                                      (course) => course['courseId']['_id'] == courseId
                                    );
                                    
                                    if (courseIdx != -1) {
                                      count++;
                                      if (count == courses.length) reqCompleted++;
                                    }
                                  }
                                }

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.secondaryContainer,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border(
                                      left: BorderSide(
                                        color: theme.colorScheme.primary,
                                        width: 4
                                      ),
                                    )
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${program['name']}',
                                            style: TextStyle(
                                              color: theme.colorScheme.secondary,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 18,
                                              decorationColor: theme.colorScheme.primary
                                            ),
                                          ),
                                          Text(
                                            '${reqCompleted}/${requirements.length} reqs - $totalCreditHours/${program['totalCredits']} hours',
                                            style: TextStyle(
                                              color: theme.colorScheme.tertiary,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                              decorationColor: theme.colorScheme.primary
                                            ),
                                          ),
                                        ],
                                      ),
                                      ListView.builder(
                                        shrinkWrap: true,
                                        physics: NeverScrollableScrollPhysics(),
                                        itemCount: requirements.length,
                                        itemBuilder: (context, index) {
                                          // get courses completed and courses registered
                                          int courseCount = 0;
                                          int enrolledCount = 0;

                                          if (requirements[index]['courseIds'].length > 0) {
                                            for (int i = 0; i < requirements[index]['courseIds'].length; i++) {
                                              final courseIdx = completed.indexWhere(
                                                (course) => course['courseId']['_id'] == requirements[index]['courseIds'][i]
                                              );
                                              final enrolledIdx = enrolled.indexWhere(
                                                (course) => course['courseId']['_id'] == requirements[index]['courseIds'][i]
                                              );

                                              if (courseIdx != -1) {
                                                courseCount++;
                                              }
                                              if (enrolledIdx != -1) {
                                                enrolledCount++;
                                              }
                                            }
                                          } else if (requirements[index]['rule'] == 'anyN') {
                                            for (int i = 0; i < enrolled.length; i++) {
                                              // get course code as string
                                              final match = RegExp(r'[A-Za-z]{3}(\d{4})$').firstMatch(enrolled[i]['courseId']['code']);
                                              if (match != null) {
                                                final level = int.parse(match.group(1)!);
                                                if (level >= requirements[index]['filter']['minLevel']) {
                                                  enrolledCount++;
                                                }
                                              }
                                            }
                                            for (int i = 0; i < completed.length; i++) {
                                              // get course code as string
                                              final match = RegExp(r'[A-Za-z]{3}(\d{4})$').firstMatch(completed[i]['courseId']['code']);
                                              if (match != null) {
                                                final level = int.parse(match.group(1)!);
                                                if (level >= requirements[index]['filter']['minLevel']) {
                                                  enrolledCount++;
                                                }
                                              }
                                            }
                                          }

                                          return Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Expanded(
                                                    child: Text('${requirements[index]['name']}',
                                                    style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold)
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8,),
                                                  Text('$courseCount/${requirements[index]['n'] ?? requirements[index]['courseIds'].length}'
                                                    '${enrolledCount == 0 ? '' : ' - $enrolledCount in progress'}',
                                                    style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16,)
                                                  ),
                                                ],
                                              ),
                                              Container(
                                                height: 12,
                                                decoration: BoxDecoration(
                                                  border: Border.all(
                                                    color: theme.colorScheme.tertiary,
                                                    width: 1
                                                  ),
                                                  borderRadius: BorderRadius.circular(20)
                                                ),
                                                child: ClipRRect(
                                                  borderRadius: BorderRadius.circular(8),
                                                  child: LinearProgressIndicator(
                                                    value: courseCount == 0 ? 0 : courseCount/(requirements[index]['n'] ?? requirements[index]['courseIds'].length),
                                                    minHeight: 8,
                                                    borderRadius: BorderRadius.circular(4),
                                                    color: (courseCount == (requirements[index]['n'] ?? requirements[index]['courseIds'].length) ? const Color.fromARGB(255, 33, 121, 36) : theme.colorScheme.primary)
                                                  ),
                                                ),
                                              ),
                                            ],
                                          );
                                        },  
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
                    ],
                  )
                ),
              ), 
            ],
          )
        )
      )
    );
  }
}