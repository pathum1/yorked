import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';

class BallResultOverlay extends StatelessWidget {
  final String outcome;
  final String delivery;
  final String shot;
  final VoidCallback onDismiss;

  const BallResultOverlay({
    super.key,
    required this.outcome,
    required this.delivery,
    required this.shot,
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

    // Auto-dismiss after 3 seconds
    Future.delayed(const Duration(seconds: 3), onDismiss);

    return Material(
      color: Colors.black87,
      child: InkWell(
        onTap: onDismiss,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null)
                ZoomIn(
                  duration: const Duration(milliseconds: 500),
                  child: Icon(icon, size: 80, color: mainColor),
                ),
              const SizedBox(height: 24),
              ZoomIn(
                duration: const Duration(milliseconds: 600),
                child: Text(
                  mainText,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 72,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 4,
                    color: mainColor,
                    shadows: [
                      Shadow(
                        color: mainColor.withOpacity(0.5),
                        blurRadius: 30,
                        offset: const Offset(0, 0),
                      )
                    ]
                  ),
                ),
              ),
              const SizedBox(height: 48),
              FadeInUp(
                delay: const Duration(milliseconds: 400),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(delivery.toUpperCase(), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16.0),
                        child: Text('VS', style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                      Text(shot.toUpperCase(), style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold, letterSpacing: 1)),
                    ],
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
