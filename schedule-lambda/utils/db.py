import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional, List

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

        if user.get('role') != 'mentor':
            return None

        return user
    except Exception as e:
        print(f"Error getting mentor: {str(e)}")
        raise

def get_mentor_requests(mentor_id: str) -> List[Dict[str, Any]]:
    """멘토의 모든 상담 신청 조회 (mentor-index GSI)"""
    try:
        response = requests_table.query(
            IndexName='mentor-index',
            KeyConditionExpression='mentor_user_id = :mentor_id',
            ExpressionAttributeValues={':mentor_id': mentor_id}
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting mentor requests: {str(e)}")
        raise

def schedule_request(
    request_id: str,
    date: str,
    start_time: str,
    end_time: str
) -> Dict[str, Any]:
    """상담 일정 등록 - 일정 정보만 저장 (status는 변경하지 않음)"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        schedule = {
            'date': date,
            'start_time': start_time,
            'end_time': end_time,
        }

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #schedule = :schedule, updated_at = :now',
            ExpressionAttributeNames={
                '#schedule': 'schedule',
            },
            ExpressionAttributeValues={
                ':schedule': schedule,
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error scheduling request: {str(e)}")
        raise

def update_schedule_request(
    request_id: str,
    date: str,
    start_time: str,
    end_time: str
) -> Dict[str, Any]:
    """상담 일정 수정"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        schedule = {
            'date': date,
            'start_time': start_time,
            'end_time': end_time,
        }

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #schedule = :schedule, updated_at = :now',
            ExpressionAttributeNames={'#schedule': 'schedule'},
            ExpressionAttributeValues={
                ':schedule': schedule,
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating schedule: {str(e)}")
        raise

def get_schedule_from_request(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 신청에서 일정 조회"""
    try:
        request_item = get_request_by_id(request_id)
        if not request_item:
            return None
        return request_item.get('schedule')
    except Exception as e:
        print(f"Error getting schedule: {str(e)}")
        raise

def update_meeting_link(request_id: str, meeting_link: str) -> Dict[str, Any]:
    """화상 회의 링크 등록/수정 - CONFIRMED 상태 일정에 meeting_link 추가"""
    try:
        update_time = int(datetime.utcnow().timestamp())
        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #schedule.meeting_link = :link, updated_at = :now',
            ExpressionAttributeNames={'#schedule': 'schedule'},
            ExpressionAttributeValues={
                ':link': meeting_link,
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating meeting link: {str(e)}")
        raise
