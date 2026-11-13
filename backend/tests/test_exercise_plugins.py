import json
import math
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import cv2
import numpy as np
from core.base_analyser import BaseAnalyser, BaseResult
from exercises import EXERCISE_REGISTRY
from exercises.jumping_jacks.analyser import JumpingJackAnalytics
from exercises.lunges.analyser import LungeAnalytics
from backend.pipeline import CalibrationState, _serialise_result, process_frame


def point(x, y, z=0.0, visibility=0.99):
    return SimpleNamespace(x=x, y=y, z=z, visibility=visibility)


def lunge_pose(angle=180.0, view="front"):
    hips = ((0.44, 0.46), (0.56, 0.46))
    knees = ((0.44, 0.64), (0.56, 0.64))
    ankles = []
    for (kx, ky) in knees:
        theta = math.radians(-90.0 + angle)
        ankles.append((kx + 0.18 * math.cos(theta), ky + 0.18 * math.sin(theta)))
    return SimpleNamespace(
        left_shoulder=point(0.40, 0.18), right_shoulder=point(0.60, 0.18),
        left_hip=point(*hips[0]), right_hip=point(*hips[1]),
        left_knee=point(*knees[0]), right_knee=point(*knees[1]),
        left_ankle=point(*ankles[0]), right_ankle=point(*ankles[1]),
        left_elbow=point(0.35, 0.3), right_elbow=point(0.65, 0.3),
        left_wrist=point(0.34, 0.4), right_wrist=point(0.66, 0.4),
        camera_view=view, pose_quality=0.99,
        neck=point(0.50, 0.18),
    )


def jumping_jack_pose(opened=False):
    left_hip_x, right_hip_x = 0.45, 0.55
    return SimpleNamespace(
        left_shoulder=point(0.42, 0.25), right_shoulder=point(0.58, 0.25),
        left_ear=point(0.46, 0.12), right_ear=point(0.54, 0.12),
        left_elbow=point(0.37 if opened else 0.43, 0.20 if opened else 0.40),
        right_elbow=point(0.63 if opened else 0.57, 0.20 if opened else 0.40),
        left_wrist=point(0.34, 0.10 if opened else 0.58),
        right_wrist=point(0.66, 0.10 if opened else 0.58),
        left_hip=point(left_hip_x, 0.50), right_hip=point(right_hip_x, 0.50),
        left_knee=point(0.42 if opened else left_hip_x, 0.70),
        right_knee=point(0.58 if opened else right_hip_x, 0.70),
        left_ankle=point(0.34 if opened else left_hip_x, 0.90),
        right_ankle=point(0.66 if opened else right_hip_x, 0.90),
        camera_view="front", pose_quality=0.99, neck=point(0.50, 0.25),
    )


class ExercisePluginTests(unittest.TestCase):
    def test_registry_exposes_new_plugins_and_original_five(self):
        expected = {"Squats", "Push-ups", "Planks", "Bicep Curls", "Shoulder Press", "Lunges", "Jumping Jacks"}
        self.assertTrue(expected.issubset(EXERCISE_REGISTRY))
        for name in expected:
            analyser = EXERCISE_REGISTRY[name]()
            self.assertIsInstance(analyser, BaseAnalyser)
            self.assertIsNone(analyser.evaluate(None))

    def test_lunge_counts_only_stand_to_valid_bottom_to_stand(self):
        analyser = LungeAnalytics()
        self.assertEqual(analyser.evaluate(lunge_pose(180)).rep_count, 0)
        self.assertEqual(analyser.evaluate(lunge_pose(135)).phase, "lowering")
        self.assertEqual(analyser.evaluate(lunge_pose(105)).phase, "bottom")
        self.assertEqual(analyser.evaluate(lunge_pose(135)).phase, "ascending")
        result = analyser.evaluate(lunge_pose(180))
        self.assertEqual(result.rep_count, 1)
        self.assertTrue(result.rep_just_completed)

        analyser.evaluate(lunge_pose(180))
        analyser.evaluate(lunge_pose(130))
        result = analyser.evaluate(lunge_pose(180))
        self.assertEqual(result.rep_count, 1)
        self.assertTrue(result.shallow_lunge)

    def test_lunge_visibility_orientation_and_tracking_loss_cancel_candidate(self):
        analyser = LungeAnalytics()
        analyser.evaluate(lunge_pose(180))
        analyser.evaluate(lunge_pose(130))
        analyser.on_tracking_lost()
        self.assertEqual(analyser.evaluate(lunge_pose(180)).rep_count, 0)

        poor = lunge_pose(180)
        poor.left_knee.visibility = 0.1
        self.assertIn("visible", analyser.evaluate(poor).feedback)
        side = analyser.evaluate(lunge_pose(180, view="side"))
        self.assertIn("Face the camera", side.feedback)

    def test_jumping_jacks_counts_complete_cycles_and_rejects_partial_or_interrupted_cycles(self):
        analyser = JumpingJackAnalytics()
        analyser.evaluate(jumping_jack_pose(False))
        self.assertEqual(analyser.evaluate(jumping_jack_pose(True)).phase, "open")
        result = analyser.evaluate(jumping_jack_pose(False))
        self.assertEqual(result.rep_count, 1)
        self.assertTrue(result.rep_just_completed)

        analyser.evaluate(jumping_jack_pose(False))
        self.assertEqual(analyser.evaluate(jumping_jack_pose(True)).rep_count, 1)
        analyser.on_tracking_lost()
        self.assertEqual(analyser.evaluate(jumping_jack_pose(False)).rep_count, 1)

        analyser.evaluate(jumping_jack_pose(False))
        partial = jumping_jack_pose(True)
        partial.left_wrist.y = 0.58
        result = analyser.evaluate(partial)
        self.assertTrue(result.coordination_issue)
        result = analyser.evaluate(jumping_jack_pose(False))
        self.assertTrue(result.incomplete_movement)
        self.assertEqual(result.rep_count, 1)

    def test_jumping_jacks_requires_visible_front_facing_pose(self):
        analyser = JumpingJackAnalytics()
        poor = jumping_jack_pose(False)
        poor.left_wrist.visibility = 0.1
        self.assertIn("visible", analyser.evaluate(poor).feedback)
        side_view = jumping_jack_pose(False)
        side_view.camera_view = "side"
        self.assertIn("Face the camera", analyser.evaluate(side_view).feedback)

    def test_calibration_requires_orientation_quality_and_enough_samples(self):
        calibration = CalibrationState(duration_s=1.0)
        calibration.start()
        self.assertEqual(calibration.update(None, recommended_view="front"), ("Move into frame", False))
        pose = lunge_pose(180)
        pose.pose_quality = 0.9
        calibration.started_at -= 2.0
        with patch("backend.pipeline.time.time", return_value=calibration.started_at + 2.0):
            for _ in range(7):
                message, complete = calibration.update(pose, recommended_view="front")
                self.assertFalse(complete)
            message, complete = calibration.update(pose, recommended_view="front")
        self.assertTrue(complete)
        self.assertEqual(calibration.baseline["camera_view"], "front")
        self.assertEqual(calibration.state, "complete")

        rejected = CalibrationState(duration_s=1.0)
        rejected.start()
        wrong_view = lunge_pose(180, view="side")
        message, complete = rejected.update(wrong_view, recommended_view="front")
        self.assertFalse(complete)
        self.assertIn("Face the camera", message)
        low_quality = lunge_pose(180)
        low_quality.pose_quality = 0.3
        message, complete = rejected.update(low_quality, recommended_view="front")
        self.assertFalse(complete)
        self.assertIn("visible", message)

    def test_pipeline_websocket_payload_and_tracking_loss_hook(self):
        frame = np.zeros((160, 120, 3), dtype=np.uint8)
        success, jpeg = cv2.imencode(".jpg", frame)
        self.assertTrue(success)
        analyser = JumpingJackAnalytics()
        payloads = []
        for pose in (jumping_jack_pose(False), jumping_jack_pose(True), jumping_jack_pose(False)):
            with patch("backend.pipeline.extract_landmarks", return_value=(pose, None)):
                payloads.append(process_frame(jpeg.tobytes(), analyser))
        self.assertEqual(payloads[-1]["status"], "ok")
        self.assertEqual(payloads[-1]["result"]["rep_count"], 1)
        self.assertEqual(payloads[-1]["result"]["metrics"]["phase"], "closed")
        json.dumps(payloads[-1])

        analyser.evaluate(jumping_jack_pose(True))
        with patch("backend.pipeline.extract_landmarks", return_value=(None, None)):
            lost = process_frame(jpeg.tobytes(), analyser)
        self.assertEqual(lost["status"], "no_pose")
        self.assertEqual(analyser.evaluate(jumping_jack_pose(False)).rep_count, 1)

    def test_original_exercises_support_desktop_analyser_contract(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        pose = jumping_jack_pose(False)
        for name in ("Squats", "Push-ups", "Planks", "Bicep Curls", "Shoulder Press"):
            analyser = EXERCISE_REGISTRY[name]()
            result = analyser.evaluate(pose)
            self.assertIsInstance(result, BaseResult, name)
            analyser.draw_hud(frame.copy(), result)
            cue = analyser.get_audio_cue(result)
            self.assertTrue(cue is None or isinstance(cue, tuple), name)

    def test_exercise_results_serialize_for_websocket_and_desktop_contract(self):
        analyser = JumpingJackAnalytics()
        analyser.evaluate(jumping_jack_pose(False))
        analyser.evaluate(jumping_jack_pose(True))
        result = analyser.evaluate(jumping_jack_pose(False))
        self.assertIsInstance(result, BaseResult)
        encoded = json.dumps(_serialise_result(result))
        payload = json.loads(encoded)
        self.assertEqual(payload["rep_count"], 1)
        self.assertTrue(payload["rep_just_completed"])
        self.assertEqual(payload["metrics"]["phase"], "closed")
        self.assertTrue(callable(analyser.draw_hud))
        self.assertTrue(callable(analyser.get_audio_cue))


if __name__ == "__main__":
    unittest.main()
