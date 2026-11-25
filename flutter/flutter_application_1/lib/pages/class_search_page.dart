import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/home_page.dart';
import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';

import '../services/auth_service.dart';
import '../services/section_service.dart';
import '../services/term_service.dart';
import '../services/enrollment_service.dart';

class ClassSearchPage extends StatefulWidget {
  const ClassSearchPage({super.key, required this.userId, this.searchTerm});

  final String userId;
  final String? searchTerm;

  @override
  State<ClassSearchPage> createState() => _ClassSearchPage();
}

class _ClassSearchPage extends State<ClassSearchPage> {
  final authService = AuthService();
  final sectionService = SectionService();
  final termService = TermService();
  final enrollmentService = EnrollmentService();

  final sectionController = TextEditingController();

  String query = '';
  String? selectedTerm = '';
  String? selectedStatus = 'any';
  String? selectedMode = 'any';

  List<dynamic> terms = [];
  List<DropdownMenuItem<String>> builtTerms = [];
  List<dynamic> sections = [];
  List<dynamic> enrolled = [];

  Iterable<dynamic> filteredSections = [];

  final builtStatuses = [
    DropdownMenuItem(value: 'any', child: Text('Any status')),
    DropdownMenuItem(value: 'open', child: Text('Open')),
    DropdownMenuItem(value: 'closed', child: Text('Closed')),
    DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
  ];
  final builtModes = [
    DropdownMenuItem(value: 'any', child: Text('Any mode')),
    DropdownMenuItem(value: 'in-person', child: Text('In person')),
    DropdownMenuItem(value: 'online', child: Text('Online')),
    DropdownMenuItem(value: 'hybrid', child: Text('Hybrid')),
  ];

  @override
  void initState() {
    super.initState();
    query = widget.searchTerm ?? '';
    getTerms();
  }

  Future<void> getTerms() async {
    try {
      final response = await termService.getTerms();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final termData = jsonDecode(response.body);

        setState(() {
          terms = termData['items'] ?? [];
        });

        // build terms dropdown list
        builtTerms = [];
        for (int i = 0; i < terms.length; i++) {
          final value = terms[i]['name'];
          final id = terms[i]['_id'];

          debugPrint(value);
          debugPrint(id);

          setState(() {
            builtTerms.add(DropdownMenuItem(value: id, child: Text(value)));
          }); 
          if (i == 0) {
            setState(() {
              selectedTerm = id;
          });
          }
        }
        debugPrint(builtTerms.toString());

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user3: $e');
    }
  }

  Future<void> getEnrollments() async {
    try {
      final response = await enrollmentService.getAllEnrollments();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final enrollmentData = jsonDecode(response.body);

        setState(() {
          enrolled = enrollmentData['items'] ?? [];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user3: $e');
    }
  }

  Future<void> getFilteredSections(dynamic termId) async {
    try {
      final response = await sectionService.getSectionsByTerm(termId); // filtered by term

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final sectionData = jsonDecode(response.body);

        sections = sectionData['items'];
        debugPrint(sectionData.toString());
        final q = query.trim().toLowerCase();

        setState(() {
          filteredSections = sections.where((section) {
            // filter by status
            if (selectedStatus != 'any' && section['status'] != selectedStatus) {
              return false;
            }
            // filter by mode
            if (selectedMode != 'any' && section['modality'] != selectedMode) {
              return false;
            }
            // filter by query
            if (!(section['title'].toString().toLowerCase().contains(q) ||
              section['subject'].toString().toLowerCase().contains(q) ||
              section['number'].toString().toLowerCase().contains(q))) {
              return false;
            }
            return true;
          });
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user3: $e');
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
        title: Text('Class Search', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
              title: Text('Home', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => HomePage(userId: widget.userId)));
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
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Class Search', style: TextStyle(color: Colors.white)),
              ),
              onTap: () {
                Navigator.pop(context);
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
                      TextFormField(
                        controller: sectionController,
                        decoration: const InputDecoration(labelText: 'Search'),
                        style: TextStyle(color: theme.colorScheme.secondary),
                        keyboardType: TextInputType.text,
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: 'any',
                              decoration: const InputDecoration(labelText: 'Status'),
                              dropdownColor: theme.colorScheme.primaryContainer,
                              style: TextStyle(color: theme.colorScheme.secondary),
                              items: builtStatuses,
                              onChanged: (value) {
                                selectedStatus = value;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: 'any',
                              decoration: const InputDecoration(labelText: 'Mode'),
                              dropdownColor: theme.colorScheme.primaryContainer,
                              style: TextStyle(color: theme.colorScheme.secondary),
                              items: builtModes,
                              onChanged: (value) {
                                selectedMode = value;
                              },
                            ),
                          ),
                        ],
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedTerm,
                              decoration: const InputDecoration(labelText: 'Category'),
                              dropdownColor: theme.colorScheme.primaryContainer,
                              style: TextStyle(color: theme.colorScheme.secondary),
                              items: builtTerms,
                              onChanged: (value) {
                                selectedTerm = value;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: ElevatedButton(
                              onPressed: () {
                                debugPrint('${sectionController.text} and $selectedTerm and $selectedStatus and $selectedMode');
                                query = sectionController.text;
                                final termIdx = terms.indexWhere(
                                  (t) => t['_id'] == selectedTerm
                                );
                                if (termIdx >= 0) {
                                  getFilteredSections(terms[termIdx]['_id']);
                                  debugPrint(filteredSections.toString());
                                }
                                else {
                                  debugPrint(terms.toString());
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: theme.colorScheme.primary
                              ),
                              child: Text('Search', style: TextStyle(color: theme.colorScheme.secondary),),
                            ),
                          ),
                        ],
                      ),
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