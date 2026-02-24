import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/player.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return authService;
});

final authStateProvider = StreamProvider<User?>((ref) {
  return authService.authStateChanges;
});

final playerProfileProvider = FutureProvider<Player?>((ref) async {
  final user = ref.watch(authStateProvider).value;
  if (user == null) return null;
  return await firestoreService.getUserProfile(user.uid);
});

final playerByUidProvider = FutureProvider.family<Player?, String>((ref, uid) async {
  if (uid.isEmpty) return null;
  return await firestoreService.getUserProfile(uid);
});

