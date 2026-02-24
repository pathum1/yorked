import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Use Oracle VM backend URL since app will be served from there
  final String baseUrl = 'https://yorked.duckdns.org/api';

  Future<String?> createMatch(String uid, int overs, int size) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/match/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'creatorUid': uid,
          'overs': overs,
          'playersPerTeam': size,
          'teamA': {
            'name': 'Team A',
            'iconId': 'bat',
          },
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['matchId'];
      }
      print('Create Match Error: ${response.statusCode} ${response.body}');
      return null;
    } catch (e) {
      print('API Error (Create Match): $e');
      return null;
    }
  }

  Future<bool> joinMatch(String uid, String matchId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/match/$matchId/join'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'uid': uid,
          'teamId': 'teamB', // Default to Team B for now
        }),
      );

      if (response.statusCode == 200) {
        return true;
      }
      print('Join Match Error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      print('API Error (Join Match): $e');
      return false;
    }
  }

  Future<bool> resolveBall(String matchId, String delivery, String shot) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/match/resolve-ball'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'matchId': matchId,
          'delivery': delivery,
          'shot': shot,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('API Error (Resolve): $e');
      return false;
    }
  }

  Future<String?> submitDelivery(String matchId, String uid, String delivery) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/match/$matchId/bowl'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'uid': uid, 'delivery': delivery}),
      );
      if (response.statusCode == 200) return null; // Success
      
      try {
        final data = jsonDecode(response.body);
        return data['error'] ?? 'Unknown backend error';
      } catch (_) {
        return 'Server returned ${response.statusCode}';
      }
    } catch (e) {
      print('API Error (Submit Delivery): $e');
      return e.toString();
    }
  }

  Future<String?> submitShot(String matchId, String uid, String shot) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/match/$matchId/bat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'uid': uid, 'shot': shot}),
      );
      if (response.statusCode == 200) return null; // Success
      
      try {
        final data = jsonDecode(response.body);
        return data['error'] ?? 'Unknown backend error';
      } catch (_) {
        return 'Server returned ${response.statusCode}';
      }
    } catch (e) {
      print('API Error (Submit Shot): $e');
      return e.toString();
    }
  }
}

final apiService = ApiService();
