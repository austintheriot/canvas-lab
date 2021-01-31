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

class LinkedList {
  head: LinkedListNode<any> | null;
  tail: LinkedListNode<any> | null;

	constructor() {
		this.head = null;
		this.tail = null;
	}

	append<T>(data: T) {
		const newNode = new LinkedListNode<T>(data, null);
		if (this.tail) this.tail.next = newNode;
		this.tail = newNode;
		if (!this.head) this.head = newNode;
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
			return deletedNode;
		}

		//if length > 1
		const deletedHead = this.head;
		this.head = this.head.next;
		return deletedHead;
	}
}

export class Queue {
  linkedList: LinkedList;

	constructor() {
		this.linkedList = new LinkedList();
	}

	add<T>(data: T) {
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

	toArray() {
		let currentNode = this.linkedList.head;
		const array = [];
		while (currentNode) {
			array.push(currentNode.data);
			currentNode = currentNode.next;
		}
		return array;
	}
};
