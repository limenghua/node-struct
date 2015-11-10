// packet_sender.cpp : 定义控制台应用程序的入口点。
//

#include "stdafx.h"


#include <cstdlib>
#include <cstring>
#include <iostream>
#include <boost/asio.hpp>

#pragma pack(1) 

using boost::asio::ip::udp;

enum { max_length = 1024 };

struct Person{
	int id;
	char name[16];
	int age;
	float weight;
	double height;

	void print(){
		std::cout << "{" << std::endl;
		std::cout << "\t" << "id:" << id << std::endl;
		std::cout << "\t" << "name:" << name << std::endl;
		std::cout << "\t" << "name:" << age << std::endl;
		std::cout << "\t" << "weight:" << weight << std::endl;
		std::cout << "\t" << "height:" << height << std::endl;
		std::cout << "}" << std::endl;
	}
};

Person THIS_PERSON = 
{
	10086,
	"huangxiaoming",
	34,
	62.35f,
	175.2
};

Person someOne;

int main(int argc, char* argv[])
{
	try
	{
		if (argc != 3)
		{
			std::cerr << "Usage: blocking_udp_echo_client <host> <port>\n";
			return 1;
		}

		boost::asio::io_service io_service;
		udp::socket s(io_service, udp::endpoint(udp::v4(), 0));
		udp::resolver resolver(io_service);
		udp::endpoint endpoint = *resolver.resolve({ udp::v4(), argv[1], argv[2] });

		std::cout << "Sending People Data: " << std::endl;;
		THIS_PERSON.print();

		s.send_to(boost::asio::buffer((char *) &THIS_PERSON, sizeof(THIS_PERSON)), endpoint);

		char reply[max_length];
		udp::endpoint sender_endpoint;
		size_t reply_length = s.receive_from(
			boost::asio::buffer(reply, max_length), sender_endpoint);
		
		Person * recvPerson = (Person *)reply;

		std::cout << "Updated People:" << std::endl;
		recvPerson->print();


		std::cin.get();

	}
	catch (std::exception& e)
	{
		std::cerr << "Exception: " << e.what() << "\n";
	}

	return 0;
}

