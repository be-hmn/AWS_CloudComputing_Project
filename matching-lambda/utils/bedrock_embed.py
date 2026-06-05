"""
Amazon Bedrock Titan Embeddings V2를 사용한 의미 기반 유사도 매칭 유틸리티.

사용 모델: amazon.titan-embed-text-v2:0
  - 최대 8,192 토큰 입력
  - 출력 벡터 차원: 1024 (기본값)
  - 리전: us-east-1 (Lambda와 동일 리전 권장)

Lambda IAM Role에 아래 권한이 필요합니다:
  bedrock:InvokeModel  on  arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
"""

from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from typing import List

import boto3

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
EMBED_MODEL_ID  = "amazon.titan-embed-text-v2:0"

# 유사도 임계값 — 이 값 이상이면 "관련 분야"로 판단
# 0.75: 꽤 관련 있음 / 0.65: 느슨하게 매칭 / 0.85: 매우 엄격
SIMILARITY_THRESHOLD = float(os.environ.get("EMBED_SIMILARITY_THRESHOLD", "0.72"))

_bedrock_client = None


def _get_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=BEDROCK_REGION,
        )
    return _bedrock_client


def _embed(text: str) -> List[float]:
    """단일 텍스트를 Titan Embeddings V2로 임베딩 벡터로 변환."""
    client = _get_client()
    body = json.dumps({"inputText": text})
    response = client.invoke_model(
        modelId=EMBED_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=body,
    )
    result = json.loads(response["body"].read())
    return result["embedding"]


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """두 벡터의 코사인 유사도 계산 (0.0 ~ 1.0)."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def is_field_match(
    interest_field: str,
    mentor_fields: List[str],
    threshold: float = SIMILARITY_THRESHOLD,
) -> tuple[bool, float]:
    """
    멘티의 관심 분야와 멘토의 전문 분야 목록을 의미적으로 비교.

    1단계: 완전 일치 / 부분 포함 검사 (Bedrock 호출 없음, 비용 절감)
    2단계: Bedrock 임베딩 유사도 검사

    반환: (매칭 여부, 최고 유사도 점수)
    """
    interest_lower = interest_field.lower().strip()
    mentor_lower   = [f.lower().strip() for f in mentor_fields]

    # ── 1단계: 문자열 기반 빠른 검사 ──────────────────────
    for mf in mentor_lower:
        if interest_lower == mf:
            return True, 1.0
        if interest_lower in mf or mf in interest_lower:
            return True, 0.95

    # ── 2단계: Bedrock 임베딩 유사도 ──────────────────────
    try:
        interest_vec = _embed(interest_field)
        best_score   = 0.0

        for mentor_field in mentor_fields:
            mentor_vec = _embed(mentor_field)
            score      = _cosine_similarity(interest_vec, mentor_vec)
            if score > best_score:
                best_score = score
            if best_score >= threshold:
                break  # 이미 충분히 높으면 조기 종료

        return best_score >= threshold, best_score

    except Exception as e:
        print(f"[bedrock_embed] Embedding error, fallback to exact match: {e}")
        # Bedrock 호출 실패 시 완전 일치 결과로 폴백
        return interest_lower in mentor_lower, 0.0
