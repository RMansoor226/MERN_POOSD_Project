import 'package:flutter/rendering.dart';
import 'package:material_ui/material_ui.dart';
import 'dart:convert';
import 'package:intl/intl.dart';

import 'package:flutter_application_1/pages/home_page.dart';
import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';

import '../services/auth_service.dart';
import '../services/course_service.dart';
import '../services/enrollment_service.dart';
import '../services/term_service.dart';
import '../services/section_service.dart';

class CourseDisplayPage extends StatefulWidget {
  const CourseDisplayPage({super.key, required this.userId, required this.courseId});

  final String userId;
  final String courseId;

  @override
  State<CourseDisplayPage> createState() => _CourseDisplayPage();
}

class _CourseDisplayPage extends State<CourseDisplayPage> {
  final authService = AuthService();
  final courseService = CourseService();
  final termService = TermService();
  final enrollmentService = EnrollmentService();
  final sectionService = SectionService();

  // course information
  dynamic course;
  String? prereqText = '';
  String? prereqAdd = '';
  List<dynamic> prereqs = [];
  List<dynamic> prereqsIds = [];
  List<dynamic> coreqs = [];
  List<dynamic> coreqsIds = [];

  // term information
  List<dynamic> terms = [];

  // enrollment information
  List<dynamic> enrollment = [];

  // section information
  List<dynamic> sections = [];

  @override 
  void initState() {
    super.initState();
    getCourseInfo();
    getEnrollments();
    getTerms();
    getSections();
  }

  Future<void> getCourseInfo({bool reqs =  false}) async {
    try {
      final response = await courseService.getCourse(widget.courseId);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final courseData = jsonDecode(response.body);
        
        if (!mounted) return;

        prereqsIds = [];
        coreqsIds = [];

        setState(() {
          course = courseData;
          prereqText = course['prereqs']?['op'] ?? '';
          prereqAdd = course['prereqText'] ?? '';
          prereqsIds = (course['prereqs']?['items'] ?? []) as List;
          coreqsIds = (course['coreqs'] ?? []) as List;
        });

        // get reqs
        getReqs();

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user1: $e');
    }
  }

  Future<void> getReqs() async {
    prereqs = [];
    coreqs = [];
    // get prereqs
    for (int i = 0; i < prereqsIds.length; i++) {
      try {
        final response = await courseService.getCourse(prereqsIds[i]['courseId']);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          final courseData = jsonDecode(response.body);
          
          if (!mounted) return;

          setState(() {
            prereqs.add(courseData); 
          });

        } else {
          debugPrint('Request failed: ${response.statusCode} ${response.body}');
        }
      } catch (e) {
        debugPrint('Could not load user1: $e');
      }
    }
    // get coreqs
    for (int i = 0; i < coreqsIds.length; i++) {
      try {
        final response = await courseService.getCourse(coreqsIds[i]);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          final courseData = jsonDecode(response.body);
          
          if (!mounted) return;

          setState(() {
            coreqs.add(courseData); 
          });

        } else {
          debugPrint('Request failed: ${response.statusCode} ${response.body}');
        }
      } catch (e) {
        debugPrint('Could not load user$i: $e');
      }
    }
  }

  Future<void> getEnrollments() async {
    try {
      final response = await enrollmentService.getAllEnrollments();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final enrollmentData = jsonDecode(response.body);
        
        setState(() {
          enrollment = enrollmentData['items'];
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user2: $e');
    }
  }

  Future<void> getTerms() async {
    try {
      final response = await termService.getTerms();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final termData = jsonDecode(response.body);

        setState(() {
          terms = (termData['items'] ?? []) as List;
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user3: $e');
    }
  }

  Future<void> getSections() async {
    try {
      final response = await sectionService.getSectionsByCourse(widget.courseId);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final sectionData = jsonDecode(response.body);

        setState(() {
          sections = (sectionData['items'] ?? []) as List;
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user4: $e');
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
        title: Text(
          '${course?['subject'] ?? 'loading...'}${course?['number'] ?? ''}: ${course?['title'] ?? ''}', 
          maxLines: 2,
          softWrap: true,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Course Catalog', style: TextStyle(color: Colors.white)),
              ),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextButton(
              onPressed:() {
                Navigator.push(context, MaterialPageRoute(builder: (context) => CourseCatalogPage(userId: widget.userId)));
              },
              child: Text(
                'Back to Course Catalog',
                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                decoration: TextDecoration.underline, decorationColor: theme.colorScheme.primary, decorationThickness: 2
                ),
              ),
            ),
            Align(
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                              'Course Information',
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Credits',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                              ),
                              Text(
                                '${course?['credits'] ?? 'loading...'}',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8,),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Department',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                              ),
                              Text(
                                '${course?['departmentId']['name'] ?? 'loading...'}',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8,),
                          Text(
                            'PREREQUISITES',
                            style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Wrap(
                            spacing: 4,
                            runSpacing: 0,
                            children: [
                              for (int index = 0; index < prereqs.length; index++) ...[
                                TextButton(
                                  onPressed:() {
                                    Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: prereqs[index]['_id'])));
                                  },
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Text(
                                    '${prereqs[index]?['subject']}${prereqs[index]?['number']}',
                                    style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                                    decoration: TextDecoration.underline, decorationColor: theme.colorScheme.outline, decorationThickness: 2
                                    ),
                                  ),
                                ),
                                Text(
                                  // (${prereqsIds?[index]['minGrade']} or better)
                                  prereqsIds[index]['minGrade'] != null ? '(${prereqsIds[index]['minGrade']} or better)' : '',
                                  style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                                ),
                                if (index != prereqs.length)
                                if (index < prereqs.length - 1)
                                Text(
                                  '${prereqText?.toLowerCase()}',
                                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                ),
                                if (index == prereqs.length - 1 && prereqText != '')
                                Text(
                                  '${prereqAdd != '' ? prereqText?.toLowerCase() : ''} $prereqAdd',
                                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                ),
                              ]
                            ]
                          ),
                          if (prereqs.isEmpty)
                          Text(
                            'none',
                            style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                          ),
                          const SizedBox(height: 8,),
                          Text(
                            'COREQUISITES',
                            style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Wrap(
                            spacing: 4,
                            runSpacing: 0,
                            children: List.generate(coreqs.length, (index) {
                              final coreq = coreqs[index];

                              return TextButton(
                                onPressed:() {
                                  Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: coreq['_id'])));
                                },
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  '${coreq?['subject']}${coreq?['number']}',
                                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                                  decoration: TextDecoration.underline, decorationColor: theme.colorScheme.outline, decorationThickness: 2
                                  ),
                                ),
                              );
                            })
                          ),
                          if (coreqs.isEmpty)
                          Text(
                            'none',
                            style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                          ),
                        ]
                      )
                    )
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                              'Sections',
                              textAlign: TextAlign.left,
                              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                              ),
                              Flexible(
                                child:TextButton(
                                  onPressed: () {
                                    Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId, searchTerm: '${course?['subject']}${course?['number']}')));
                                  },
                                  child: Text(
                                    'Search classes for ${course?['subject']}${course?['number']}',
                                    style: TextStyle(color: theme.colorScheme.secondary, fontSize: 14,
                                    decoration: TextDecoration.underline, decorationColor: theme.colorScheme.outline, decorationThickness: 2
                                    ), 
                                  ),
                                ),
                              ),
                            ],
                          ),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: NeverScrollableScrollPhysics(),
                            itemCount: terms.length,
                            padding: EdgeInsets.zero,
                            itemBuilder: (context, index1) {
                              final term = terms[index1];

                              // check if term has classes
                              bool hasSection = false;
                              for (int i = 0; i < sections.length; i++) {
                                if (sections[i]['termId']['_id'] == term['_id']) {
                                  hasSection = true;
                                }
                              }

                              List<dynamic> tmpSection = sections;

                              if (hasSection) {
                                tmpSection = sections.where((section) {
                                  // check if same term
                                  if (section['termId']['_id'] != term['_id']) {
                                    return false;
                                  }
                                  return true;
                                }).toList(); 
                              }

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${term?['name'] ?? ''}',
                                    style: TextStyle(color: theme.colorScheme.secondary, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  ListView.builder(
                                    shrinkWrap: true,
                                    physics: NeverScrollableScrollPhysics(),
                                    itemCount: tmpSection.length,
                                    itemBuilder:(context, index) {
                                      final section = tmpSection[index];
                                      final status = switch (section['status']) {
                                                      'open' => section['capacity'] != section['enrolledCount'] ? 'open' : 'waitlist',
                                                      'closed' => 'closed',
                                                      _ => 'loading...'
                                                    };
                                      
                                      // check to see if you are in the course
                                      final courseIdx = enrollment.indexWhere(
                                        (e) => e['courseId']['_id'] == section['courseId']['_id'] &&
                                                e['status'] != 'dropped'
                                      );

                                      final sectionIdx = enrollment.indexWhere(
                                        (e) => e['sectionId']['_id'] == section['_id'] &&
                                                e['status'] != 'dropped'
                                      );

                                      // check if section belongs to term
                                      if ((section?['termId']['_id'] == term?['_id'])) {
                                        return Padding(
                                          padding: EdgeInsets.only(bottom: 8),
                                          child: Container(
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              color: theme.colorScheme.secondaryContainer,
                                              borderRadius: BorderRadius.circular(16),
                                              border: Border(
                                                left: BorderSide(
                                                  color: switch (section['status']) {
                                                    'open' => section['capacity'] == section['enrolledCount'] ? theme.colorScheme.primary : theme.colorScheme.tertiaryContainer,
                                                    'closed' => theme.colorScheme.onPrimary,
                                                    _ => theme.colorScheme.primary
                                                  },
                                                  width: 4
                                                ),
                                              ),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      'Prof: ${section?['instructorIds'][0]['firstName']} ${section?['instructorIds'][0]['lastName']}',
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),
                                                    Text(
                                                      'Status: $status',
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),
                                                  ],
                                                ),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Expanded(child: Text(
                                                      '${section?['meetings'][0]['days']?.join("")} ${formatMinutes(section?['meetings'][0]['startMinute']).format(context)} - ${formatMinutes(section?['meetings'][0]['endMinute']).format(context)}',
                                                      textAlign: TextAlign.left,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),),
                                                    Expanded(child: Text(
                                                      'Seats: ${section?['enrolledCount']}/${section?['capacity']}',
                                                      textAlign: TextAlign.right,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),),
                                                  ],
                                                ),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      '${section?['meetings'][0]['building']} ${section?['meetings'][0]['room']}',
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),
                                                    Expanded(child: Text(
                                                      'Waitlist: ${section?['waitlistCount']}/${section?['waitlistCapacity']}',
                                                      textAlign: TextAlign.right,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),),
                                                  ],
                                                ),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Expanded(child: Text(
                                                      'Section: ${section?['sectionNumber']}',
                                                      textAlign: TextAlign.left,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),),
                                                    if (courseIdx == -1) // not in the course
                                                    Expanded(
                                                      child: ElevatedButton(
                                                        style: ElevatedButton.styleFrom(
                                                          backgroundColor: theme.colorScheme.primary,
                                                          foregroundColor: theme.colorScheme.onPrimary,
                                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                                        ),
                                                        onPressed: () async {
                                                          try {
                                                            final response = await enrollmentService.addEnrollment(section['_id']);

                                                            if (response.statusCode >= 200 && response.statusCode < 300) {
                                                              final enrollmentData = jsonDecode(response.body);
                                                              
                                                              setState(() {
                                                                enrollment.add(enrollmentData);
                                                              });

                                                            } else {
                                                              debugPrint('Request failed: ${response.statusCode} ${response.body}');
                                                            }
                                                          } catch (e) {
                                                            debugPrint('Could not load user: $e');
                                                          }
                                                        },
                                                        child: Text(
                                                          section['capacity'] == section['enrolledCount'] ? 'Join waitlist' : 'Register',
                                                          style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                        ),
                                                      )
                                                    ),
                                                    if (courseIdx != -1 && sectionIdx != -1) // in the course, in the right section
                                                    Text(
                                                      '${enrollment[courseIdx]['status']} ${enrollment[sectionIdx]['waitlistPosition'] != null ? '#${enrollment[sectionIdx]['waitlistPosition']}' : ''}',
                                                      textAlign: TextAlign.left,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),
                                                    if (courseIdx != -1 && sectionIdx == -1) // in the course, wrong section
                                                    Text(
                                                      '${enrollment[courseIdx]['status']} in ${enrollment[courseIdx]['sectionId']['sectionNumber']}',
                                                      textAlign: TextAlign.left,
                                                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          )
                                        );
                                      }
                                      return null;
                                    },
                                  )
                                ]
                              );
                            }
                          ),
                        ]
                      )
                    )
                  ),
                ],
              ),
            )
          ],
        ),
      )
    );
  }
}