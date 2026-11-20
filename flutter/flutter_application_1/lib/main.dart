import 'dart:developer';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'pages/login_page.dart';


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
      title: 'Flutter Demo',
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
      home: const LoginPage(title: 'Course Registration'),
    );
  }
}