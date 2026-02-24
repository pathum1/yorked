import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';

class BallResultOverlay extends StatelessWidget {
  final String outcome;
  final String delivery;
  final String shot;
  final String commentary;
  final VoidCallback onDismiss;

  const BallResultOverlay({
    super.key,
    required this.outcome,
    required this.delivery,
    required this.shot,
    required this.commentary,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    String mainText = '';
    Color mainColor = Colors.white;
    IconData? icon;

    if (outcome == 'DOT') {
      mainText = 'DOT BALL';
      mainColor = Colors.grey.shade400;
      icon = Icons.block;
    } else if (outcome == '4') {
      mainText = 'FOUR! 🔥';
      mainColor = Colors.blue;
      icon = Icons.sports_cricket;
    } else if (outcome == '6') {
      mainText = 'SIX! 🚀';
      mainColor = Colors.amber;
      icon = Icons.rocket_launch;
    } else if (outcome.startsWith('W_')) {
      final type = outcome.split('_')[1];
      mainText = 'WICKET!\n$type 💥';
      mainColor = Colors.red;
      icon = Icons.local_fire_department;
    } else {
      mainText = '$outcome RUN${outcome == '1' ? '' : 'S'}';
      mainColor = Colors.white;
      icon = Icons.run_circle;
    }

    // Auto-dismiss after 4 seconds to give time to read commentary
    Future.delayed(const Duration(seconds: 4), onDismiss);

    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 120.0, left: 24, right: 24), // Above the action bar
        child: FadeInUp(
          duration: const Duration(milliseconds: 300),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onDismiss,
              borderRadius: BorderRadius.circular(24),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.95),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: mainColor.withOpacity(0.5), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: mainColor.withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 2,
                      offset: const Offset(0, 10),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top Row: Icon and Runs
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: 32, color: mainColor),
                          const SizedBox(width: 12),
                        ],
                        Text(
                          mainText,
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                            color: mainColor,
                            shadows: [
                              Shadow(
                                color: mainColor.withOpacity(0.5),
                                blurRadius: 10,
                                offset: const Offset(0, 0),
                              )
                            ]
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 12),
                    
                    // Middle Row: Delivery vs Shot
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black26,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(delivery.toUpperCase(), style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12.0),
                            child: Text('VS', style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          Text(shot.toUpperCase(), style: const TextStyle(color: Colors.blueAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Bottom Row: Commentary
                    Text(
                      '"$commentary"',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
