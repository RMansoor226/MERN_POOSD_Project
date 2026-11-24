import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';

class DepartmentService {
  static String get _baseUrl => dotenv.get('BASE_URL');
  static const _storage = FlutterSecureStorage();

  // get all departments
  Future<http.Response> getAllDepartments() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/departments?page=1&limit=100',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      }
    );
  }
}