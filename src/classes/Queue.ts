//implement a simple queue with the following functionalities:
//add()
//remove()
//peek()
//isEmpty()

class LinkedListNode<T> {
	data: T;
	next: LinkedListNode<any> | null;

	constructor(data: T, next: LinkedListNode<any> | null) {
		this.data = data;
		this.next = next;
	}
}

class LinkedList<T> {
	head: LinkedListNode<T> | null;
	tail: LinkedListNode<T> | null;
	length: number;

	constructor() {
		this.head = null;
		this.tail = null;
		this.length = 0;
	}

	append(data: T) {
		const newNode = new LinkedListNode<T>(data, null);
		if (this.tail) this.tail.next = newNode;
		this.tail = newNode;
		if (!this.head) this.head = newNode;
		this.length++;
		return this;
	}

	deleteHead() {
		//if length === 0
		if (!this.head) return null;

		//if length === 1
		if (this.head === this.tail) {
			const deletedNode = this.head;
			this.head = null;
			this.tail = null;
			this.length--;
			return deletedNode;
		}

		//if length > 1
		const deletedHead = this.head;
		this.head = this.head.next;
		this.length--;
		return deletedHead;
	}
}

export class Queue<T> {
	linkedList: LinkedList<T>;

	constructor() {
		this.linkedList = new LinkedList();
	}

	add(data: T) {
		this.linkedList.append(data);
		return this;
	}

	remove() {
		const deleteData = this.linkedList.head ? this.linkedList.head.data : null;
		this.linkedList.deleteHead();
		return deleteData;
	}

	peek() {
		return this.linkedList.head ? this.linkedList.head.data : null;
	}

	isEmpty() {
		return !this.linkedList.head;
	}

	size() {
		return this.linkedList.length;
	}

	toArray() {
		let currentNode = this.linkedList.head;
		const array = [];
		while (currentNode) {
			array.push(currentNode.data);
			currentNode = currentNode.next;
		}
		return array;
	}
}
