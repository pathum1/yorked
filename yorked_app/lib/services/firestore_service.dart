import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/player.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<Player?> getUserProfile(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (doc.exists) {
      return Player.fromJson(doc.data()!, uid);
    }
    return null;
  }

  Future<void> createUserProfile(String uid, Player player) async {
    final json = player.toJson();
    json['createdAt'] = FieldValue.serverTimestamp();
    await _db.collection('users').doc(uid).set(json);
  }

  Future<void> updateUserProfile(String uid, Map<String, dynamic> updates) async {
    updates['updatedAt'] = FieldValue.serverTimestamp();
    await _db.collection('users').doc(uid).update(updates);
  }

  Future<void> updateFcmToken(String uid, String token) async {
    await _db.collection('users').doc(uid).update({'fcmToken': token});
  }
}

final firestoreService = FirestoreService();

