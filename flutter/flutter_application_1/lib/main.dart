import 'dart:developer';
import 'package:flutter_application_1/pages/admin_page.dart';
import 'package:flutter_application_1/pages/admin_page_display.dart';
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
          outline: Color.fromRGBO(243, 240, 36, 1),
          onPrimary: const Color.fromARGB(255, 160, 0, 0),
          onSecondary: const Color.fromARGB(255, 31, 110, 62),
          onError: const Color.fromARGB(255, 238, 68, 68),
          onErrorContainer: const Color.fromARGB(255, 129, 45, 45),
        ),
        scaffoldBackgroundColor: const Color.fromARGB(255, 16, 16, 16),
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginPage(title: 'Login Page'),
      }
    );
  }
}