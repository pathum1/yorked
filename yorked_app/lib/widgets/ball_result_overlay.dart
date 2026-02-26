import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';

class BallResultOverlay extends StatefulWidget {
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
  State<BallResultOverlay> createState() => _BallResultOverlayState();
}

class _BallResultOverlayState extends State<BallResultOverlay> {
  bool _isExiting = false;

  @override
  void initState() {
    super.initState();
    // Auto-dismiss after 4 seconds to give time to read commentary
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) {
        setState(() {
          _isExiting = true;
        });
        // Wait for the exit animation to complete before removing the widget from the tree
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) {
            widget.onDismiss();
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    String mainText = '';
    Color mainColor = Colors.white;
    IconData? icon;

    if (widget.outcome == 'DOT') {
      mainText = 'DOT BALL';
      mainColor = Colors.grey.shade400;
      icon = Icons.block;
    } else if (widget.outcome == '4') {
      mainText = 'FOUR! 🔥';
      mainColor = Colors.blue;
      icon = Icons.sports_cricket;
    } else if (widget.outcome == '6') {
      mainText = 'SIX! 🚀';
      mainColor = Colors.amber;
      icon = Icons.rocket_launch;
    } else if (widget.outcome.startsWith('W_')) {
      final type = widget.outcome.split('_')[1];
      mainText = 'WICKET!\n$type 💥';
      mainColor = Colors.red;
      icon = Icons.local_fire_department;
    } else {
      mainText = '${widget.outcome} RUN${widget.outcome == '1' ? '' : 'S'}';
      mainColor = Colors.white;
      icon = Icons.run_circle;
    }

    final cardContent = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (!_isExiting && mounted) {
            setState(() {
              _isExiting = true;
            });
            Future.delayed(const Duration(milliseconds: 300), () {
              if (mounted) widget.onDismiss();
            });
          }
        },
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
                    Text(widget.delivery.toUpperCase(), style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12.0),
                      child: Text('VS', style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                    Text(widget.shot.toUpperCase(), style: const TextStyle(color: Colors.blueAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  ],
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Bottom Row: Commentary
              Text(
                '"${widget.commentary}"',
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
    );

    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 120.0, left: 24, right: 24), // Above the action bar
        child: _isExiting
            ? FadeOutDown(duration: const Duration(milliseconds: 300), child: cardContent)
            : FadeInUp(duration: const Duration(milliseconds: 300), child: cardContent),
      ),
    );
  }
}

