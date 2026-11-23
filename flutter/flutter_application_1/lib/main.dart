import 'dart:developer';
import 'package:flutter_application_1/pages/course_display_page.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'pages/login_page.dart';
import 'pages/home_page.dart';
import 'pages/course_catalog_page.dart';
import 'pages/course_display_page.dart';
import 'pages/class_search_page.dart';
import 'pages/program_display_page.dart';
import 'pages/programs_page.dart';


void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    debugPrint('Loading .env...');
    await dotenv.load(fileName: 'config.env').timeout(
      const Duration(seconds: 10),
    );
    debugPrint('Loaded .env: ${dotenv.env.keys.toList()}');
  } catch (e, st) {
    debugPrint('Failed to load .env: $e');
    debugPrintStack(stackTrace: st);
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bettermyucf',
      theme: ThemeData(
        colorScheme: .fromSeed(
          seedColor: const Color.fromARGB(255, 22, 22, 22),
          surface: const Color.fromARGB(255, 0, 0, 0),
          primaryContainer: const Color(0xFF12121c),
          secondaryContainer: const Color(0xff1a1a22),
          tertiaryContainer: const Color(0xFF63e394),
          primary: const Color.fromARGB(169, 255, 201, 4),
          secondary: const Color(0xFFFFFFFF),
          tertiary: const Color.fromARGB(255, 176, 176, 176),
        ),
        scaffoldBackgroundColor: const Color.fromARGB(255, 16, 16, 16),
      ),
      initialRoute: '/login',
      routes: {
        '/home': (context) {final userId = ModalRoute.of(context)!.settings.arguments as String;
            return HomePage(userId: userId);},
        '/login': (context) => const LoginPage(title: 'Login Page'),
        '/catalog':(context) {final userId = ModalRoute.of(context)!.settings.arguments as String;
            return CourseCatalogPage(userId: userId);},
        'classes':(context) {final userId = ModalRoute.of(context)!.settings.arguments as String;
            return ClassSearchPage(userId: userId);},
        '/programs':(context) {final userId = ModalRoute.of(context)!.settings.arguments as String;
            return ProgramsPage(userId: userId);},
      },
      onGenerateRoute: (id) {
        final uri = Uri.parse(id.name ?? '');

        if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'programs') {
          final programId = uri.pathSegments[1];

          return MaterialPageRoute(
            builder: (context) => ProgramDisplayPage(userId: ModalRoute.of(context)!.settings.arguments as String, programId: programId)
          );
        } else if (uri.pathSegments.length == 2 && uri.pathSegments[0] == 'catalog') {
          final courseId = uri.pathSegments[1];

          return MaterialPageRoute(
            builder: (context) => CourseDisplayPage(userId: ModalRoute.of(context)!.settings.arguments as String, courseId: courseId)
          );
        }

        return MaterialPageRoute(
          builder: (context) => const Scaffold(
            body: Center(child: Text('Page not found'))
          ),
        );
      },
    );
  }
}