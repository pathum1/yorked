import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/match_state.dart';

final activeMatchesProvider = StreamProvider.family<List<MatchState>, String>((ref, uid) {
  final db = FirebaseFirestore.instance;
  
  // Query matches where user is in teamA.players array
  return db.collection('matches')
    .where('teamA.players', arrayContains: uid)
    .where('status', isNotEqualTo: 'completed')
    .snapshots()
    .map((snap) {
      final matches = snap.docs.map((d) => MatchState.fromJson(d.data(), d.id)).toList();
      // Filter out deleted matches client-side because Firestore only supports one 'isNotEqualTo'
      return matches.where((match) => match.status != 'deleted').toList();
    });
});

final currentMatchProvider = StreamProvider.family<MatchState?, String>((ref, matchId) {
  final db = FirebaseFirestore.instance;
  return db.collection('matches').doc(matchId).snapshots().map((snap) {
    if (!snap.exists) return null;
    return MatchState.fromJson(snap.data()!, snap.id);
  });
});
