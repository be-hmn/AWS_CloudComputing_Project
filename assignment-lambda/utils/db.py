import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional

dynamodb = boto3.resource('dynamodb')
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])

def get_request_by_id(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 신청 조회"""
    try:
        response = requests_table.get_item(Key={'request_id': request_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting request: {str(e)}")
        raise

def get_mentor_by_id(mentor_id: str) -> Optional[Dict[str, Any]]:
    """멘토 조회"""
    try:
        response = users_table.get_item(Key={'user_id': mentor_id})
        user = response.get('Item')

        if not user:
            return None

        # role이 mentor인지 확인
        if user.get('role') != 'mentor':
            return None

        return user
    except Exception as e:
        print(f"Error getting mentor: {str(e)}")
        raise

def assign_mentor(request_id: str, mentor_user_id: str) -> Dict[str, Any]:
    """멘토 배정"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET mentor_user_id = :mentor_id, #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':mentor_id': mentor_user_id,
                ':status': 'ASSIGNED',
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error assigning mentor: {str(e)}")
        raise

def approve_assignment(request_id: str) -> Dict[str, Any]:
    """배정 승인"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #status = :status, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'CONFIRMED',
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error approving assignment: {str(e)}")
        raise

def reject_assignment(request_id: str, reject_reason: str) -> Dict[str, Any]:
    """배정 거절 - 멘토가 반려하면 상태를 PENDING으로 되돌리고 mentor_user_id 제거"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        reject_record = {
            'reject_reason': reject_reason
        }

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='REMOVE mentor_user_id SET #status = :status, #record = :record, updated_at = :now',
            ExpressionAttributeNames={
                '#status': 'status',
                '#record': 'record'
            },
            ExpressionAttributeValues={
                ':status': 'PENDING',
                ':record': reject_record,
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error rejecting assignment: {str(e)}")
        raise
