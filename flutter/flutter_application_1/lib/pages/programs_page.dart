import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/home_page.dart';
import 'package:flutter_application_1/pages/admin_page.dart';
import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/program_display_page.dart';

import '../services/auth_service.dart';
import '../services/program_service.dart';

class ProgramsPage extends StatefulWidget {
  const ProgramsPage({super.key, required this.userId, required this.role});

  final String userId;
  final String role;

  @override
  State<ProgramsPage> createState() => _ProgramsPage();
}

class _ProgramsPage extends State<ProgramsPage> {
  final authService = AuthService();
  final programService = ProgramService();

  List<dynamic> majors = [];
  List<dynamic> minors = [];

  @override
  void initState() {
    super.initState();
    getPrograms();
  }

  Future<void> getPrograms() async {
    try {
      final response = await programService.getAllPrograms();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final programData = jsonDecode(response.body);
        
        final program = programData['items'];
        for (int i = 0; i < program.length; i++) {
          if (program[i]['type'] == 'major') {
            setState(() {
              majors.add(program[i]);
            });
          }
          else {
            setState(() {
              minors.add(program[i]);
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
        title: Text('Programs', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
            if (widget.role == 'admin')
            ListTile(
              title: Text('Admin', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => AdminPage(userId: widget.userId, role: 'admin')));
              }
            )
            else
            ListTile(
              title: Text('Home', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => HomePage(userId: widget.userId, role: widget.role)));
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
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Programs', style: TextStyle(color: Colors.white)),
              ),
              onTap: () {
                Navigator.pop(context);
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
                        'Majors',
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),  
                      const SizedBox(height: 8,),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        padding: EdgeInsets.zero,
                        itemCount: majors.length,
                        itemBuilder: (context, index) {
                          final program = majors[index];
                          
                          return Padding(
                            padding: EdgeInsets.zero,
                            child: Container(
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
                                      TextButton(
                                        style: TextButton.styleFrom(
                                          alignment: Alignment.centerLeft,
                                          padding: EdgeInsets.zero,
                                          minimumSize: Size.zero,
                                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                        onPressed: () {
                                          Navigator.push(context, MaterialPageRoute(builder: (context) => ProgramDisplayPage(userId: widget.userId, programId: program['_id'], title: program['name'], role: widget.role,)));
                                        },
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${program['name']}',
                                              style: TextStyle(color: theme.colorScheme.secondary, fontSize: 20, fontWeight: FontWeight.bold,
                                                decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2
                                              ),
                                            ),
                                            if (program['degree'] != null)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: theme.colorScheme.primary,
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                '${program['degree']}',
                                                style: TextStyle(
                                                  color: theme.colorScheme.secondary,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        'Catalog: ${program['catalogYear']}',
                                        style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 12,
                                        ),
                                      ),
                                      Text(
                                        '${program['totalCredits']} Credits - ${program['requirements'].length}',
                                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                        textAlign: TextAlign.left,
                                      ),
                                    ],
                                  )),
                                ],
                              ), 
                            )
                          );
                        }
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Minors',
                        textAlign: TextAlign.left,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),  
                      const SizedBox(height: 8,),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        padding: EdgeInsets.zero,
                        itemCount: minors.length,
                        itemBuilder: (context, index) {
                          final program = minors[index];
                          
                          return Padding(
                            padding: EdgeInsets.zero,
                            child: Container(
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
                                      TextButton(
                                        style: TextButton.styleFrom(
                                          alignment: Alignment.centerLeft,
                                          padding: EdgeInsets.zero,
                                          minimumSize: Size.zero,
                                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                        onPressed: () {
                                          Navigator.push(context, MaterialPageRoute(builder: (context) => ProgramDisplayPage(userId: widget.userId, programId: program['_id'], title: program['name'], role: widget.role)));
                                        },
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${program['name']}',
                                              style: TextStyle(color: theme.colorScheme.secondary, fontSize: 20, fontWeight: FontWeight.bold,
                                                decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2
                                              ),
                                            ),
                                            if (program['degree'] != null)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: theme.colorScheme.primary,
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                '${program['degree']}',
                                                style: TextStyle(
                                                  color: theme.colorScheme.secondary,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        'Catalog: ${program['catalogYear']}',
                                        style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 12,
                                        ),
                                      ),
                                      Text(
                                        '${program['totalCredits']} Credits - ${program['requirements'].length}',
                                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                        textAlign: TextAlign.left,
                                      ),
                                    ],
                                  )),
                                ],
                              ), 
                            )
                          );
                        }
                      )
                    ],
                  ),
                ),
              ),
            ]
          )
        )
      )
    );
  }
}