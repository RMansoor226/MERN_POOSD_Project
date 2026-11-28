import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';
import 'package:flutter_application_1/pages/program_display_page.dart';

import '../services/auth_service.dart';
import '../services/admin_service.dart';


class AdminPageDisplay extends StatefulWidget {
  const AdminPageDisplay({super.key, required this.userId, required this.pageType, required this.role, this.title, this.information});

  final String userId;
  final String pageType;
  final String role;
  final String? title;
  final List<dynamic>? information;

  @override
  State<AdminPageDisplay> createState() => _AdminPageDisplayState();
}

class _AdminPageDisplayState extends State<AdminPageDisplay> {
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
  }

  @override
  void dispose() {
    firstNameController.dispose();
    lastNameController.dispose();
    emailController.dispose();
    super.dispose();
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
        title: Text('${widget.title}', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextButton(
                onPressed:() {
                  Navigator.pop(context);
                },
                child: Text(
                  'Back to Admin',
                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                  decoration: TextDecoration.underline, decorationColor: theme.colorScheme.primary, decorationThickness: 2
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          '${widget.pageType} test',
                          textAlign: TextAlign.left,
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      Wrap(
                        children: [
                          Text(
                            '${widget.information}',
                            textAlign: TextAlign.left,
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                          ),
                        ],
                      )
                    ]
                  )
                )
              )
            ],
          )
        )
      )
    );
  }
}