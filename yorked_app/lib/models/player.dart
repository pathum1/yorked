class Player {
  final String uid;
  final String displayName;
  final String avatarId;
  final String role;
  final String bowlingStyle;
  final BattingAttributes batting;
  final BowlingAttributes bowling;
  final CareerStats careerStats;
  final String? fcmToken;

  Player({
    required this.uid,
    required this.displayName,
    required this.avatarId,
    required this.role,
    required this.bowlingStyle,
    required this.batting,
    required this.bowling,
    required this.careerStats,
    this.fcmToken,
  });

  factory Player.fromJson(Map<String, dynamic> json, String uid) {
    return Player(
      uid: uid,
      displayName: json['displayName'] ?? '',
      avatarId: json['avatarId'] ?? '',
      role: json['role'] ?? 'batsman',
      bowlingStyle: json['bowlingStyle'] ?? 'fast',
      batting: BattingAttributes.fromJson(json['attributes']?['batting'] ?? {}),
      bowling: BowlingAttributes.fromJson(json['attributes']?['bowling'] ?? {}),
      careerStats: CareerStats.fromJson(json['careerStats'] ?? {}),
      fcmToken: json['fcmToken'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'displayName': displayName,
      'avatarId': avatarId,
      'role': role,
      'bowlingStyle': bowlingStyle,
      'attributes': {
        'batting': batting.toJson(),
        'bowling': bowling.toJson(),
      },
      'careerStats': careerStats.toJson(),
      'fcmToken': fcmToken,
      'updatedAt': DateTime.now(),
    };
  }
}

class BattingAttributes {
  final int technique;
  final int power;
  final int timing;

  BattingAttributes({required this.technique, required this.power, required this.timing});

  factory BattingAttributes.fromJson(Map<String, dynamic> json) {
    return BattingAttributes(
      technique: json['technique'] ?? 1,
      power: json['power'] ?? 1,
      timing: json['timing'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
    'technique': technique,
    'power': power,
    'timing': timing,
  };
}

class BowlingAttributes {
  final int accuracy;
  final int pace;
  final int variation;

  BowlingAttributes({required this.accuracy, required this.pace, required this.variation});

  factory BowlingAttributes.fromJson(Map<String, dynamic> json) {
    return BowlingAttributes(
      accuracy: json['accuracy'] ?? 1,
      pace: json['pace'] ?? 1,
      variation: json['variation'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
    'accuracy': accuracy,
    'pace': pace,
    'variation': variation,
  };
}

class CareerStats {
  final int matches;
  final int wins;
  final int losses;
  final int runsScored;
  final int wicketsTaken;

  CareerStats({
    this.matches = 0,
    this.wins = 0,
    this.losses = 0,
    this.runsScored = 0,
    this.wicketsTaken = 0,
  });

  factory CareerStats.fromJson(Map<String, dynamic> json) {
    return CareerStats(
      matches: json['matches'] ?? 0,
      wins: json['wins'] ?? 0,
      losses: json['losses'] ?? 0,
      runsScored: json['runsScored'] ?? 0,
      wicketsTaken: json['wicketsTaken'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'matches': matches,
    'wins': wins,
    'losses': losses,
    'runsScored': runsScored,
    'wicketsTaken': wicketsTaken,
  };
}
