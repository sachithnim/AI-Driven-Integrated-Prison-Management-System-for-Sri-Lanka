import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import numpy as np
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

class TestAudioProcessing(unittest.IsolatedAsyncioTestCase):
    async def test_audio_processing_logic(self):
        print("Starting test setup...")
        
        # Create mocks for the modules we want to bypass
        mock_yolo_module = MagicMock()
        mock_audio_module = MagicMock()
        mock_action_module = MagicMock()
        mock_fusion_module = MagicMock()
        mock_db_module = MagicMock()
        mock_stream_module = MagicMock()
        
        # Setup specific mocks that the service class uses during __init__ or import
        # The service imports classes from these modules
        mock_yolo_module.YoloDetector = MagicMock()
        mock_audio_module.AudioDetector = MagicMock()
        mock_action_module.ActionDetector = MagicMock()
        mock_fusion_module.FusionMLP = MagicMock()
        
        # We need to mock the socket manager in app.api.endpoints.stream
        mock_stream_module.manager = MagicMock()

        # Apply patches to sys.modules
        with patch.dict(sys.modules, {
            'app.models.yolo_detector': mock_yolo_module,
            'app.models.audio_detector': mock_audio_module,
            'app.models.action_detector': mock_action_module,
            'app.models.fusion_model': mock_fusion_module,
            'app.db': mock_db_module,
            'app.db.models': MagicMock(),
            'app.api.endpoints.stream': mock_stream_module,
            # We also need to ensure real dependencies that cause issues are not imported if referenced
            # But the service only imports the above app.* modules.
            # violence_detector.py imports:
            # import av (fine)
            # import cv2 (fine usually, but maybe mock if needed)
            # import numpy (fine)
            # import asyncio (fine)
            # import time (fine)
            # from sqlalchemy.orm import Session (fine)
            # from app.models... (mocked)
            # from app.db import models (mocked)
            # from app.api.endpoints.stream import manager (mocked)
        }):
            # Now we can import the service. It will use the mocked modules.
            # We must do this inside the patch block.
            # Also, since we might have imported it before (if running multiple tests), reload might be needed
            # but for a single run script it's fine.
            # However, if 'app' was already imported, submodules might be cached.
            # We are running this as a script, so it's fresh.
            
            print("Importing ViolenceDetectorService...")
            from app.services.violence_detector import ViolenceDetectorService
            
            service = ViolenceDetectorService(db=MagicMock())
            
            # Now setup the mocks on the instance specifically for our test logic
            # The __init__ assigned self.audio = AudioDetector(), which is our mock class instance
            service.audio.predict = MagicMock(return_value=[{'class': 'Screaming', 'score': 0.9, 'is_violent': True}])
            
            # Setup av mocks
            # We are using real 'av' module (not mocked in sys.modules) so we need to patch av.open and av.AudioResampler
            
            print("Patching av dependencies...")
            with patch('av.open') as mock_av_open, \
                 patch('av.AudioResampler') as MockResampler, \
                 patch('time.time') as mock_time:
                
                # Setup container
                mock_container = MagicMock()
                mock_av_open.return_value = mock_container
                
                # Streams
                video_stream = MagicMock()
                video_stream.type = 'video'
                audio_stream = MagicMock()
                audio_stream.type = 'audio'
                mock_container.streams.video = [video_stream]
                mock_container.streams.audio = [audio_stream]
                
                # Resampler
                mock_resampler_instance = MockResampler.return_value
                class MockFrame:
                    def __init__(self, samples):
                        self.samples = samples
                        self.pts = 0
                    def to_ndarray(self, format=None):
                        return self.samples.reshape(1, -1)
                
                # Return dummy data from resampler
                # 20000 samples to trigger >= 16000 check
                dummy_samples = np.zeros(20000, dtype=np.float32) 
                mock_resampled_frame = MockFrame(dummy_samples)
                mock_resampler_instance.resample.return_value = [mock_resampled_frame]
                
                # Packets
                audio_packet = MagicMock()
                audio_packet.stream.type = 'audio'
                audio_packet.decode.return_value = [MagicMock()] 
                
                video_packet = MagicMock()
                video_packet.stream.type = 'video'
                video_frame = MagicMock()
                video_frame.to_ndarray.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
                video_packet.decode.return_value = [video_frame]
                
                mock_container.demux.return_value = iter([audio_packet, video_packet])
                
                # Time control
                # 1. last_processed init (0)
                # 2. video packet current_time (1.0) -> 1.0 - 0 > 0.2 -> True
                mock_time.side_effect = [0, 1.0, 1.0, 1.0, 1.0]

                # Spy on _analyze_frame
                # We need to replace it on the instance
                service._analyze_frame = AsyncMock(spec=service._analyze_frame)
                
                print("Running process_stream...")
                await service.process_stream("rtsp://dummy", 1)
                print("Finished process_stream")
                
                # Assertions
                MockResampler.assert_called_with(format='fltp', layout='mono', rate=16000)
                assert service._analyze_frame.called
                
                args = service._analyze_frame.call_args[0]
                passed_audio_buffer = args[2]
                print(f"Captured Buffer Size: {len(passed_audio_buffer)}")
                self.assertEqual(len(passed_audio_buffer), 20000)

if __name__ == "__main__":
    unittest.main()
