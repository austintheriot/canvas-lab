class LinkedListNode<T> {
	data: T;
	next: LinkedListNode<T> | null;

	constructor(data: T, next: LinkedListNode<T> | null) {
		this.data = data;
		this.next = next;
	}
}

class LinkedList<T> {
	head: LinkedListNode<T> | null;
	length: number;

	constructor() {
		this.head = null;
		this.length = 0;
	}

	prepend(data: T) {
		const newNode = new LinkedListNode(data, this.head);
		this.head = newNode;
		this.length++;
		return this;
	}

	deleteHead() {
		if (this.length === 0) return null;
		if (this.head) this.head = this.head.next;
		this.length--;
		return this;
	}
}

export class Stack<T> {
	linkedList: LinkedList<T>;

	constructor() {
		this.linkedList = new LinkedList();
	}

	push(data: T) {
		this.linkedList.prepend(data);
		return this;
	}

	pop() {
		const deletedData = this.linkedList.head ? this.linkedList.head.data : null;
		this.linkedList.deleteHead();
		return deletedData;
	}

	peek() {
		return this.linkedList.head ? this.linkedList.head.data : null;
	}

	isEmpty() {
		return !this.linkedList.head;
	}
}
