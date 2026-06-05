"""
S3 증빙 파일 관련 유틸리티.
버킷: pj-kmucloud-5-v2-verfications
"""
import boto3
import os
import uuid
from typing import Dict

VERIFICATION_BUCKET = os.environ.get('VERIFICATION_BUCKET', 'pj-kmucloud-5-v2-verfications')
PRESIGNED_URL_EXPIRES = 900   # 업로드용 15분
DOWNLOAD_URL_EXPIRES  = 900   # 다운로드(열람)용 15분

_s3 = None

def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client('s3')
    return _s3


def generate_upload_presigned_url(mentor_id: str, field: str, filename: str,
                                   content_type: str = 'application/octet-stream') -> Dict[str, str]:
    """
    멘토가 증빙 파일을 S3에 직접 업로드할 Presigned PUT URL 생성.
    키 형식: verifications/{mentor_id}/{uuid}_{filename}
    ContentType을 Presigned URL에 포함해 브라우저 PUT 요청과 일치시킴.
    """
    s3 = _get_s3()
    file_key = f"verifications/{mentor_id}/{uuid.uuid4()}_{filename}"

    url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket':      VERIFICATION_BUCKET,
            'Key':         file_key,
            'ContentType': content_type,
        },
        ExpiresIn=PRESIGNED_URL_EXPIRES,
    )
    return {'upload_url': url, 'file_key': file_key}


def generate_download_presigned_url(file_key: str) -> str:
    """운영자가 증빙 파일을 열람할 Presigned GET URL 생성."""
    s3 = _get_s3()
    return s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': VERIFICATION_BUCKET, 'Key': file_key},
        ExpiresIn=DOWNLOAD_URL_EXPIRES,
    )


def delete_file(file_key: str) -> None:
    """증빙 파일 삭제 (거절 처리 시 선택적으로 사용)."""
    s3 = _get_s3()
    s3.delete_object(Bucket=VERIFICATION_BUCKET, Key=file_key)
