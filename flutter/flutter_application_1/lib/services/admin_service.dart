import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AdminService {
  static String get _baseUrl => dotenv.get('BASE_URL');
  static const _storage = FlutterSecureStorage();

  // get departments
  Future<http.Response> getDepartments() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/departments',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get terms
  Future<http.Response> getTerms() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/terms',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get instructors
  Future<http.Response> getInstructors() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/instructors',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get courses
  Future<http.Response> getCourses() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/courses',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get sections
  Future<http.Response> getSections() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/sections',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get programs
  Future<http.Response> getPrograms() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/programs',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  // get users
  Future<http.Response> getUsers() async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/users',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }
}