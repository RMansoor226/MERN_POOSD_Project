import 'package:material_ui/material_ui.dart';
import 'dart:convert';

import 'package:flutter_application_1/pages/home_page.dart';
import 'package:flutter_application_1/pages/course_catalog_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';
import 'package:flutter_application_1/pages/course_display_page.dart';

import '../services/auth_service.dart';
import '../services/program_service.dart';
import '../services/course_service.dart';

class ProgramDisplayPage extends StatefulWidget {
  const ProgramDisplayPage({super.key, required this.userId, required this.programId, this.title});

  final String userId;
  final String programId;
  final String? title;

  @override
  State<ProgramDisplayPage> createState() => _ProgramDisplayPage();
}

class _ProgramDisplayPage extends State<ProgramDisplayPage> {
  final authService = AuthService();
  final programService = ProgramService();
  final courseService = CourseService();

  dynamic programInfo;

  @override
  void initState() {
    super.initState();
    getProgram();
  }

  Future<void> getProgram() async {
    try {
      final response = await programService.getProgram(widget.programId);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final programData = jsonDecode(response.body);
        
        setState(() {
          programInfo = programData;
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  Future<int> getTotalCredits(List<dynamic> courses) async {
    int tc = 0;
    for (int i = 0; i < courses.length; i++) {
      try {
        final response = await courseService.getCourse(courses[i]);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          final course = jsonDecode(response.body);
          
          tc += course['credits'] as int;

        } else {
          debugPrint('Request failed: ${response.statusCode} ${response.body}');
        }
      } catch (e) {
        debugPrint('Could not load user: $e');
      }
    }
    return tc;
  }

  Future<List<dynamic>> getFilteredCourses(dynamic requirement) async {
    List<dynamic> filteredCourses = [];
     if (requirement['rule'] == 'anyN') {
      List<dynamic> allCourses = [];
      try {
        final response = await courseService.getAllCourses();
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          final courseData = jsonDecode(response.body);
          
          allCourses = courseData['items'];

          filteredCourses = allCourses.where((course) {
            final code = course['subject'] + course['number'];
            final match = RegExp(r'[A-Za-z]{3}(\d{4})$').firstMatch(code);
            if (match != null) {
              final level = int.parse(match.group(1)!);
              if (level >= requirement['filter']['minLevel']) {
                return true;
              }
            }
            return false;
          }).toList();

        } else {
          debugPrint('Request failed: ${response.statusCode} ${response.body}');
        }
      } catch (e) {
        debugPrint('Could not load user: $e');
      }
    }
    return filteredCourses;
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
        title: Text(widget.title ?? 'no title', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
              title: Text('Class Search', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ClassSearchPage(userId: widget.userId)));
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
                Navigator.pop(context);
              },
              child: Text(
                'Back to Programs',
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
                    padding: const EdgeInsets.only(left: 24, right: 24, top: 0, bottom: 12),
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
                            'Program Information',
                            style: TextStyle(color: theme.colorScheme.secondary, fontSize: 20, fontWeight: FontWeight.bold)
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Type',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16,)
                              ),
                              Text(
                                '${programInfo?['degree'] ?? ''} ${programInfo?['type'] ?? ''}',
                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold)
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Catalog Year',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16,)
                              ),
                              Text(
                                '${programInfo?['catalogYear'] ?? ''}',
                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold)
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Total credits',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16,)
                              ),
                              Text(
                                '${programInfo?['totalCredits'] ?? ''}',
                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold)
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Department',
                                style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16,)
                              ),
                              Text(
                                '${programInfo?['name'] ?? ''}',
                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16, fontWeight: FontWeight.bold)
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(padding: EdgeInsets.only(left: 12), 
                  child: Text(
                      'Requirements',
                      style: TextStyle(color: theme.colorScheme.secondary, fontSize: 24, fontWeight: FontWeight.bold)
                    ),
                  ),
                  
                  ListView.builder(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    padding: EdgeInsets.zero,
                    itemCount: programInfo?['requirements'].length ?? 0,
                    itemBuilder: (context, index) {
                      final requirement = programInfo['requirements'][index];
                      
                      return Container(
                        padding: const EdgeInsets.only(left: 24, right: 24, top: 12, bottom: 12),
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
                                    '${requirement['name']}',
                                    style: TextStyle(color: theme.colorScheme.secondary, fontSize: 24, fontWeight: FontWeight.bold)
                                  ),
                                  if (requirement['courseIds'].length != 0)
                                  FutureBuilder(
                                    future: getTotalCredits(requirement['courseIds']),
                                    builder: (context, snapshot) {
                                      if (snapshot.connectionState == ConnectionState.waiting) {
                                        return const CircularProgressIndicator();
                                      }

                                      if (snapshot.hasError) {
                                        return Text('Could not load program: ${snapshot.error}');
                                      }

                                      final response = snapshot.data!;
                                      
                                      return Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '$response total credits',
                                            style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                                          ),
                                        ],
                                      );
                                    }
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8,),
                              if (requirement['courseIds'].length != 0)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: ListView.builder(
                                  shrinkWrap: true,
                                  physics: NeverScrollableScrollPhysics(),
                                  padding: EdgeInsets.zero,
                                  itemCount: requirement['courseIds'].length,
                                  itemBuilder: (context, index) {
                                    final courseId = requirement['courseIds'][index];

                                    return FutureBuilder(
                                      future: courseService.getCourse(courseId),
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

                                        final courseInfo = jsonDecode(response.body) as Map<String, dynamic>;

                                        return Column(
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
                                              onPressed:() {
                                                Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: courseInfo['_id'])));
                                              },
                                              child: Text(
                                                '${courseInfo['title']}',
                                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                                                decoration: TextDecoration.underline, decorationColor: theme.colorScheme.primary, decorationThickness: 2
                                                ),
                                              ),
                                            ),
                                            Text(
                                              '${courseInfo['credits']} credits',
                                              style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                                            ),
                                          ],
                                        );
                                      }
                                    );
                                  },
                                )
                              )
                              else
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'From any ${requirement['filter']['subject']} course at the ${requirement['filter']['minLevel']} level',
                                      style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                                    ),
                                    const SizedBox(height: 8,),
                                    FutureBuilder(
                                      future: getFilteredCourses(requirement),
                                      builder: (context, snapshot) {
                                        if (snapshot.connectionState == ConnectionState.waiting) {
                                          return const CircularProgressIndicator();
                                        }

                                        if (snapshot.hasError) {
                                          return Text('Could not load program: ${snapshot.error}');
                                        }

                                        final response = snapshot.data!;
                                        
                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            ListView.builder(
                                              shrinkWrap: true,
                                              physics: NeverScrollableScrollPhysics(),
                                              padding: EdgeInsets.zero,
                                              itemCount: response.length,
                                              itemBuilder: (context, index) {
                                                final course = response[index];

                                                return Column(
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
                                                      onPressed:() {
                                                        Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: course['_id'])));
                                                      },
                                                      child: Text(
                                                        '${course['title']}',
                                                        style: TextStyle(color: theme.colorScheme.secondary, fontSize: 16,
                                                        decoration: TextDecoration.underline, decorationColor: theme.colorScheme.primary, decorationThickness: 2
                                                        ),
                                                      ),
                                                    ),
                                                    Text(
                                                      '${course['credits']} credits',
                                                      style: TextStyle(color: theme.colorScheme.tertiary, fontSize: 16),
                                                    ),
                                                  ],
                                                );
                                              }
                                            ),
                                          ],
                                        );
                                      }
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                      );
                    }
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}