import 'package:flutter_application_1/pages/course_display_page.dart';
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

  List<dynamic> filteredSections = [];

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
    sectionController.text = widget.searchTerm ?? '';
    query = sectionController.text;
    getTerms(start: true);
    getEnrollments();
  }

  Future<void> getTerms({bool start = false}) async {
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

          setState(() {
            builtTerms.add(DropdownMenuItem(value: id, child: Text(value)));
          }); 
          if (i == 0) {
            setState(() {
              selectedTerm = id;
          });
          }
        }

      getFilteredSections(terms[0]['_id']);

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
            if (!(section['courseId']['title'].toString().toLowerCase().contains(q) ||
                  section['courseId']['code'].toString().toLowerCase().contains(q)
              )) {
              return false;
            }
            return true;
          }).toList();
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user3: $e');
    }
  }

  TimeOfDay formatMinutes(int mins) {
    final time = TimeOfDay(
      hour: mins ~/ 60, minute: mins % 60
    );

    return time;
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
                                query = sectionController.text;
                                final termIdx = terms.indexWhere(
                                  (t) => t['_id'] == selectedTerm
                                );
                                if (termIdx >= 0) {
                                  getFilteredSections(terms[termIdx]['_id']);
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
              ListView.builder(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                itemCount: filteredSections.length,
                itemBuilder: (context, index) {
                  final filsec = filteredSections[index];

                  final courseInfo = filsec['courseId'];
                  final instructorInfo = filsec['instructorIds'][0];
                  final locationInfo = filsec['meetings'][0];

                  int isEnrolled = enrolled.indexWhere(
                    (e) => e['sectionId']['_id'] == filsec['_id'] &&
                    e['status'] != 'dropped'
                  );

                  int elseEnrolled = enrolled.indexWhere(
                    (e) => e['courseId']['_id'] == filsec['courseId']['_id'] &&
                    (e['status'] == 'waitlisted' || e['status'] == 'enrolled')
                  );

                  return Padding(
                    padding: EdgeInsets.only(left: 24, right:24, bottom: 12),
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
                                ),
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: courseInfo['_id'])));
                                },
                                child: Text(
                                  '${courseInfo['code']}'
                                  ' - ${instructorInfo['firstName']} ${instructorInfo['lastName']}',
                                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 20, fontWeight: FontWeight.bold,
                                    decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2
                                  ),
                                ),
                              ),
                              Text(
                                'Section ${filsec['sectionNumber']} - ${courseInfo['title']}',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                textAlign: TextAlign.left,
                              ),
                              Text(
                                '${locationInfo['days'].join()} ${formatMinutes(locationInfo['startMinute']).format(context)}'
                                ' - ${formatMinutes(locationInfo['endMinute']).format(context)}',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                textAlign: TextAlign.left,
                              ),
                              Text(
                                'Room: ${locationInfo['building']} ${locationInfo['room']}',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                                textAlign: TextAlign.left,
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  // if waitlisted
                                  if (filsec['capacity'] == filsec['enrolledCount'])
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.primary,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      'Waitlist: ${filsec['waitlistCount']}/${filsec['waitlistCapacity']}',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.outline,
                                      ),
                                      textAlign: TextAlign.left,
                                    ),
                                  )
                                  // if open
                                  else if (filsec['status'] == 'open')
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.onSecondary,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      'Open: ${filsec['enrolledCount']}/${filsec['capacity']}',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.tertiaryContainer,
                                      ),
                                      textAlign: TextAlign.left,
                                    ),
                                  )
                                  else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.onErrorContainer,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      'Closed',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.onError,
                                      ),
                                      textAlign: TextAlign.left,
                                    ),
                                  ),
                                  // if enrolled and in that class
                                  if (isEnrolled != -1 && enrolled[isEnrolled]['sectionId']['_id'] == filsec['_id'])
                                  Text(
                                      enrolled[isEnrolled]['status'] != 'waitlisted' ? 'registered' : 'waitlisted',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.tertiary,
                                      ),
                                      textAlign: TextAlign.left,
                                  )
                                  else if (elseEnrolled != -1)
                                  Text(
                                      '${enrolled[elseEnrolled]['status'] == 'waitlisted' ? 'waitlisted in' : 
                                      'registered in'} ${enrolled[elseEnrolled]['sectionId']['sectionNumber']}',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.tertiary,
                                      ),
                                      textAlign: TextAlign.left,
                                  )
                                  // if waitlisted
                                  else if (filsec['capacity'] == filsec['enrolledCount'])
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      foregroundColor: theme.colorScheme.secondaryContainer,
                                      side: BorderSide(color: const Color.fromARGB(255, 110, 110, 110)),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                    ),
                                    onPressed: () async {
                                      try {
                                        final response = await enrollmentService.addEnrollment(filsec['_id']);

                                        if (response.statusCode >= 200 && response.statusCode < 300) {
                                          final enrollmentData = jsonDecode(response.body);
                                          
                                          setState(() {
                                            enrolled.add(enrollmentData);
                                            filsec['waitlistCount'] = (filsec['waitlistCount'] as int) + 1;
                                          });

                                        } else {
                                          debugPrint('Request failed: ${response.statusCode} ${response.body}');
                                        }
                                      } catch (e) {
                                        debugPrint('Could not load user: $e');
                                      }
                                    },
                                    child: Text(
                                      'Join Waitlist',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.secondary,
                                      ),
                                      textAlign: TextAlign.left,
                                    ),
                                  )
                                  // if open
                                  else if (filsec['status'] == 'open')
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      backgroundColor: theme.colorScheme.primary,
                                    ),
                                    onPressed: () async {
                                      try {
                                        final response = await enrollmentService.addEnrollment(filsec['_id']);

                                        if (response.statusCode >= 200 && response.statusCode < 300) {
                                          final enrollmentData = jsonDecode(response.body);
                                          
                                          setState(() {
                                            enrolled.add(enrollmentData);
                                            filsec['enrolledCount'] = (filsec['enrolledCount'] as int) + 1;
                                          });

                                        } else {
                                          debugPrint('Request failed: ${response.statusCode} ${response.body}');
                                        }
                                      } catch (e) {
                                        debugPrint('Could not load user: $e');
                                      }
                                    },
                                    child: Text(
                                      'Register',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.secondary,
                                      ),
                                      textAlign: TextAlign.left,
                                    ),
                                  )
                                ],
                              ),
                            ],
                          )),
                        ],
                      ), 
                    )
                  );
                },
              ),
            ]
          )
        )
      )
    );
  }
}