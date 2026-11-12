import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AuthService {
  static const _baseUrl = 'http://10.0.2.2:5000';
  static const _storage = FlutterSecureStorage();

  Future<http.Response> updateUser(
    String id, {
    required String firstName,
    required String lastName,
    String? email,
  }) async {
    final token = await _storage.read(key: 'token');

    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/users/${Uri.encodeComponent(id)}',
    );

    debugPrint(id);
    debugPrint(firstName);
    debugPrint(lastName);
    debugPrint(email);

    return http.patch(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
      })
    );
  }

  Future<String?> getId() {
  return _storage.read(key: 'id');
  }

  Future<http.Response> getUserById(String id) async {
    final token = await _storage.read(key: 'token');
   
    if (token == null) {
      throw StateError('No session token found. Please log in first.');
    }

    final uri = Uri.parse(
      '$_baseUrl/api/users/${Uri.encodeComponent(id)}',
    );

    return http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
  }

  Future<void> logout() async {
    await _storage.delete(key: 'session_token');
  }

  Future<http.Response> login({
    required String login,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'login': login, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final id = data['id'] as String;
      await _storage.write(key: 'id', value: id);
      final token = data['token'] as String;
      await _storage.write(key: 'token', value: token);
    }
    return response;
  }

  Future<http.Response> register({
  required String login,
  required String password,
  required String firstName,
  required String lastName,
  String? email
  }) {
    return http.post(
      Uri.parse('$_baseUrl/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firstName': firstName,
        'lastName': lastName,
        'login': login,
        'password': password,
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      }),
    );
  }
}