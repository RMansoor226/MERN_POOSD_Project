import 'dart:developer';
import 'package:material_ui/material_ui.dart';

import 'pages/login_page.dart';


void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: .fromSeed(
          seedColor: const Color.fromARGB(255, 22, 22, 22),
          surface: const Color.fromARGB(255, 0, 0, 0),
          primaryContainer: const Color(0xff181A1B),
          primary: const Color.fromARGB(169, 255, 201, 4),
          secondary: const Color(0xFFFFFFFF),
        ),
        scaffoldBackgroundColor: const Color.fromARGB(255, 16, 16, 16),
      ),
      home: const LoginPage(title: 'Course Registration'),
    );
  }
}