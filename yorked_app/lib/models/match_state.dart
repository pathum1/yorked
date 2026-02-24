class MatchState {
  final String id;
  final String status;
  final String creatorId;
  final int maxOvers;
  final int teamSize;
  final List<String> teamA;
  final List<String> teamB;
  final String teamACaptain;
  final String? teamBCaptain;
  final int currentInnings;
  final Map<String, dynamic> toss;
  final Map<String, dynamic>? innings1;
  final Map<String, dynamic>? innings2;
  final String? deletedAt;
  final String? deletedBy;

  MatchState({
    required this.id,
    required this.status,
    required this.creatorId,
    required this.maxOvers,
    required this.teamSize,
    required this.teamA,
    required this.teamB,
    required this.teamACaptain,
    this.teamBCaptain,
    required this.currentInnings,
    required this.toss,
    this.innings1,
    this.innings2,
    this.deletedAt,
    this.deletedBy,
  });

  /// Get the current active innings data
  Map<String, dynamic>? get currentInningsData =>
      currentInnings == 1 ? innings1 : innings2;

  factory MatchState.fromJson(Map<String, dynamic> json, String id) {
    return MatchState(
      id: id,
      status: json['status'] ?? 'lobby',
      creatorId: json['creatorUid'] ?? json['teamA']?['captainUid'] ?? '',
      maxOvers: json['overs'] ?? 5,
      teamSize: json['playersPerTeam'] ?? 11,
      teamA: List<String>.from(json['teamA']?['players'] ?? []),
      teamB: List<String>.from(json['teamB']?['players'] ?? []),
      teamACaptain: json['teamA']?['captainUid'] ?? '',
      teamBCaptain: json['teamB']?['captainUid'],
      currentInnings: json['currentInnings'] ?? 1,
      toss: Map<String, dynamic>.from(json['toss'] ?? {}),
      innings1: json['innings1'] != null ? Map<String, dynamic>.from(json['innings1']) : null,
      innings2: json['innings2'] != null ? Map<String, dynamic>.from(json['innings2']) : null,
      deletedAt: json['deletedAt'],
      deletedBy: json['deletedBy'],
    );
  }
}
