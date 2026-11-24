import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';

class EnrollmentService {
  static String get _baseUrl => dotenv.get('BASE_URL');
  static const _storage = FlutterSecureStorage();

  // get all enrollment
  Future<http.Response> getAllEnrollments() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/enrollments?limit=100',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      }
    );
  }

  // drop enrollment
  Future<http.Response> dropEnrollment(
    String classId,
  ) async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/enrollments/${Uri.encodeComponent(classId)}',
    );

    return http.patch(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: jsonEncode({
        'status': 'dropped',
      })
    );
  }

  // add enrollment
  Future<http.Response> addEnrollment(
    String sectionId,
  ) async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/enrollments',
    );

    return http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: jsonEncode({
        'sectionId': sectionId,
      })
    );
  }

  // get user enrollments
  Future<http.Response> getEnrollment() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/enrollments?page=1&limit=100',
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