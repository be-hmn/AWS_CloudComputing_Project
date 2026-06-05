import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional, List

dynamodb = boto3.resource('dynamodb')
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])

def get_request_by_id(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 신청 조회"""
    try:
        response = requests_table.get_item(Key={'request_id': request_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting request: {str(e)}")
        raise

def create_record(
    request_id: str,
    summary: str,
    follow_up_task: str,
    needs_next_consultation: bool
) -> Dict[str, Any]:
    """상담 기록 작성 - COMPLETED 상태의 신청에만 기록 가능"""
    try:
        update_time = int(datetime.utcnow().timestamp())

        # ISO 8601 형식의 시간
        created_at_iso = datetime.utcnow().isoformat() + 'Z'

        record = {
            'summary': summary,
            'follow_up_task': follow_up_task,
            'needs_next_consultation': needs_next_consultation,
            'created_at': created_at_iso
        }

        response = requests_table.update_item(
            Key={'request_id': request_id},
            UpdateExpression='SET #record = :record, updated_at = :now',
            ExpressionAttributeNames={
                '#record': 'record',
            },
            ExpressionAttributeValues={
                ':record': record,
                ':now': update_time
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error creating record: {str(e)}")
        raise

def get_record_from_request(request_id: str) -> Optional[Dict[str, Any]]:
    """상담 기록 조회"""
    try:
        request_item = get_request_by_id(request_id)
        if not request_item:
            return None

        return request_item.get('record')
    except Exception as e:
        print(f"Error getting record: {str(e)}")
        raise

def get_all_records() -> List[Dict[str, Any]]:
    """전체 상담 기록 조회 (운영자용) - record 필드가 존재하는 항목만 반환"""
    try:
        response = requests_table.scan(
            FilterExpression='attribute_exists(#record) AND #status = :status',
            ExpressionAttributeNames={
                '#record': 'record',
                '#status': 'status',
            },
            ExpressionAttributeValues={':status': 'COMPLETED'}
        )
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = requests_table.scan(
                FilterExpression='attribute_exists(#record) AND #status = :status',
                ExpressionAttributeNames={
                    '#record': 'record',
                    '#status': 'status',
                },
                ExpressionAttributeValues={':status': 'COMPLETED'},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        return items
    except Exception as e:
        print(f"Error getting all records: {str(e)}")
        raise
