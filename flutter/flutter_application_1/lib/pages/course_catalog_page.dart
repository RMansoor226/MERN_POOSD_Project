import 'package:material_ui/material_ui.dart';
import 'dart:convert';

import 'package:flutter_application_1/pages/home_page.dart';
import 'package:flutter_application_1/pages/class_search_page.dart';
import 'package:flutter_application_1/pages/programs_page.dart';
import 'package:flutter_application_1/pages/course_display_page.dart';

import '../services/auth_service.dart';
import '../services/department_service.dart';
import '../services/course_service.dart';

class CourseCatalogPage extends StatefulWidget {
  const CourseCatalogPage({super.key, required this.userId});

  final String userId;

  @override
  State<CourseCatalogPage> createState() => _CourseCatalogPage();
}

class _CourseCatalogPage extends State<CourseCatalogPage> {
  final authService = AuthService();

  final departmentService = DepartmentService();
  final courseService = CourseService();

  // catalog filter stuff
  final catalogController = TextEditingController();
  String query = '';
  String? selectedDepartment = 'all';
  List<dynamic> allDepartments = [];
  List<DropdownMenuItem<String>> builtDepartments = [];
  
  // courses
  List<dynamic> allCourses = [];
  List<dynamic> filteredCourses = [];

  @override
  void initState() {
    super.initState();
    loadAllDepartments();
    getCourses();
  }

  Future<void> loadAllDepartments() async {
    try {
      final response = await departmentService.getAllDepartments();

      if (response.statusCode >= 200 || response.statusCode < 300) {
        final departmentData = jsonDecode(response.body);

        setState(() {
          allDepartments = departmentData['items'] as List;
          builtDepartments = buildDepartmentItems(allDepartments);
        });

      } else {
        debugPrint('Request failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('Could not load user: $e');
    }
  }

  List<DropdownMenuItem<String>> buildDepartmentItems(List<dynamic> departments){
    List<DropdownMenuItem<String>> items = [const DropdownMenuItem(value: 'all', child: Text('All departments'))];
    
    for (int i = 0; i < departments.length; i++) {
      final code = departments[i]['code']?.toString() ?? '';
      final name = departments[i]['name']?.toString() ?? 'unnamed';
      
      if (code.isNotEmpty) {
        items.add(DropdownMenuItem(value: code, child: Text(name)));
      }
    }
    return items;
  }

  Future<void> getCourses() async {
    try {
      final response = await courseService.getAllCourses();

      if (response.statusCode >= 200 || response.statusCode < 300) {
        final courseData = jsonDecode(response.body);

        allCourses = courseData['items'];
        
        List<dynamic> tmp = [];
        if (selectedDepartment == 'all') {
          tmp = allCourses;
        } else {
          for (int i = 0; i < allCourses.length; i++) {
            if (allCourses[i]['departmentId']['code'] == selectedDepartment) {
              tmp.add(allCourses[i]);
            }
          }
        }
        final q = query.toLowerCase();
        setState(() {
          filteredCourses = tmp.where((fil) {
            final code = fil['subject'].toString().toLowerCase() + fil['number'].toString().toLowerCase();
            if (!(fil['title'].toString().toLowerCase().contains(q) || 
                 code.contains(q))) {
              return false;
            }
            return true;
          }).toList();
        });

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
        title: Text('Course Catalog', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.secondary)),
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
                      TextFormField(
                        controller: catalogController,
                        decoration: const InputDecoration(labelText: 'Search'),
                        style: TextStyle(color: theme.colorScheme.secondary),
                        keyboardType: TextInputType.text,
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedDepartment,
                              decoration: const InputDecoration(labelText: 'Category'),
                              dropdownColor: theme.colorScheme.primaryContainer,
                              style: TextStyle(color: theme.colorScheme.secondary),
                              items: builtDepartments,
                              onChanged: (value) {
                                selectedDepartment = value;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: ElevatedButton(
                              onPressed: () {
                                query = catalogController.text;
                                getCourses();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: theme.colorScheme.primary
                              ),
                              child: Text('Search', style: TextStyle(color: theme.colorScheme.secondary),)
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
                itemCount: filteredCourses.length,
                itemBuilder: (context, index) {

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
                                Navigator.push(context, MaterialPageRoute(builder: (context) => CourseDisplayPage(userId: widget.userId, courseId: filteredCourses[index]['_id'])));
                              },
                              child: Text(
                                '${filteredCourses[index]['subject']}${filteredCourses[index]['number']}'
                                ' - ${filteredCourses[index]['title']}',
                                style: TextStyle(color: theme.colorScheme.secondary, fontSize: 20, fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline, decorationColor: Color.fromRGBO(243, 240, 36, 1), decorationThickness: 2
                                ),
                              ),
                            ),
                            Text(
                              '${filteredCourses[index]['departmentId']['name']}'
                              '${filteredCourses[index]['attributes'].length == 0 ? '' : ' - ${filteredCourses[index]?['attributes'].join(', ')}'}'
                              ' - ${filteredCourses[index]['credits']} ${filteredCourses[index]['credits'] == 1 ? 'credit' : 'credits'}',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.tertiary),
                              textAlign: TextAlign.left,
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